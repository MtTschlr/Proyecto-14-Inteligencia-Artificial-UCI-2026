import io
import os
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from ultralytics import YOLO

MODEL_PATH = Path(os.getenv("MODEL_PATH", Path(__file__).resolve().parent.parent / "best.pt"))
DEFECT_CONF = float(os.getenv("DEFECT_CONF", "0.25"))
MIN_AREA = float(os.getenv("MIN_AREA", "0.01"))
MAX_FILL = float(os.getenv("MAX_FILL", "0.93"))
RED_SWAP = float(os.getenv("RED_SWAP", "0.5"))
MAX_SIDE = int(os.getenv("MAX_SIDE", "1600"))
CLIP_VERIFY = os.getenv("CLIP_VERIFY", "1") == "1"
CLIP_SWAP = float(os.getenv("CLIP_SWAP", "0.6"))
CLIP_MARGIN = float(os.getenv("CLIP_MARGIN", "0.25"))
CLIP_MAX_CROPS = int(os.getenv("CLIP_MAX_CROPS", "6"))
IMG_SIZE = 640
MAX_POLYGON_POINTS = 80
MIN_PART = 0.05
DEFECT_CLASS = "defecto"
NO_FRUIT = "No se detectó ninguna fruta en la imagen. Encuadrá la fruta con buena luz."

STATE_FROM_SUFFIX = {
    "verde": "VERDE",
    "madura": "MADURO",
    "maduro": "MADURO",
    "sobrepasada": "SOBREPASADO",
    "sobrepasado": "SOBREPASADO",
}
TOMATE_FROM_NARANJA = {
    "naranja_verde": "tomate_verde",
    "naranja_madura": "tomate_maduro",
    "naranja_sobrepasada": "tomate_sobrepasado",
}

# El modelo solo entrega la clase (fruta_estado), las máscaras y la confianza.
# Calibre, peso y vida útil salen de estas reglas fijas por fruta y estado
# (mismas que usa el modo demo en src/services/fruitRules.ts).
FRUIT_RULES = {
    "banana": {
        "name": "Banana",
        "caliber": "Calibre A (más de 20 cm)",
        "weight": "Caja estándar 18 kg",
        "shelf_life": {"VERDE": "7 a 10 días", "MADURO": "2 a 4 días", "SOBREPASADO": "1 día"},
    },
    "mango": {
        "name": "Mango",
        "caliber": "Calibre mediano (350 a 450 g)",
        "weight": "Caja 10 kg",
        "shelf_life": {"VERDE": "5 a 8 días", "MADURO": "3 a 5 días", "SOBREPASADO": "1 día"},
    },
    "naranja": {
        "name": "Naranja",
        "caliber": "Calibre 72 (mediana)",
        "weight": "Caja 15 kg",
        "shelf_life": {"VERDE": "10 a 14 días", "MADURO": "7 a 10 días", "SOBREPASADO": "2 a 3 días"},
    },
    "tomate": {
        "name": "Tomate",
        "caliber": "Calibre M (60 a 70 mm)",
        "weight": "Cajón 18 kg",
        "shelf_life": {"VERDE": "8 a 12 días", "MADURO": "4 a 6 días", "SOBREPASADO": "1 a 2 días"},
    },
}

MASCULINE = {"mango", "tomate"}

# Textos para CLIP. Las claves de PROJECT_FRUITS son las frutas del modelo; el resto,
# cosas que el modelo puede confundir con fruta.
PROJECT_FRUITS = {
    "banana": ["banana", "green banana", "ripe banana", "overripe banana with brown spots"],
    "mango": ["mango", "green mango", "ripe mango", "rotten mango"],
    "naranja": ["orange fruit", "green orange fruit", "ripe orange fruit", "moldy orange fruit"],
    "tomate": ["tomato", "red tomato", "green tomato", "rotten tomato"],
}
OTHER_THINGS = {
    "manzana": ["apple", "red apple", "green apple"],
    "limón": ["lemon", "lime"],
    "mandarina": ["tangerine", "mandarin orange"],
    "durazno": ["peach"],
    "pera": ["pear"],
    "papaya": ["papaya"],
    "pomelo": ["grapefruit"],
    "frutilla": ["strawberry"],
    "techo": ["ceiling"],
    "pared": ["wall"],
    "lámpara": ["lamp"],
    "pelota": ["ball", "basketball"],
    "mano": ["hand"],
    "cara": ["face", "person"],
    "sombrero": ["hat"],
    "mesa": ["table"],
    "caja": ["box", "cardboard box"],
}
# CLIP no distingue bien estas frutas parecidas: su puntaje se suma al de la fruta del proyecto.
CLIP_RELATIVES = {"naranja": {"mandarina", "pomelo"}, "mango": {"papaya", "durazno"}}
CLIP_TEMPLATES = [
    "a photo of a {}.",
    "a close-up photo of a {}.",
    "a cropped photo of the {}.",
    "a low resolution photo of a {}.",
]

model = YOLO(str(MODEL_PATH))


class ClipVerifier:
    def __init__(self):
        import open_clip

        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="laion2b_s34b_b79k"
        )
        self.model.eval()
        tokenizer = open_clip.get_tokenizer("ViT-B-32")
        self.names = list(PROJECT_FRUITS) + list(OTHER_THINGS)
        groups = {**PROJECT_FRUITS, **OTHER_THINGS}
        embeddings = []
        with torch.no_grad():
            for name in self.names:
                texts = [t.format(p) for p in groups[name] for t in CLIP_TEMPLATES]
                emb = self.model.encode_text(tokenizer(texts))
                emb = emb / emb.norm(dim=-1, keepdim=True)
                emb = emb.mean(dim=0)
                embeddings.append(emb / emb.norm())
        self.text = torch.stack(embeddings)

    def classify(self, crops: list[Image.Image]) -> list[dict[str, float]]:
        with torch.no_grad():
            batch = torch.stack([self.preprocess(c) for c in crops])
            img = self.model.encode_image(batch)
            img = img / img.norm(dim=-1, keepdim=True)
            probs = (100.0 * img @ self.text.T).softmax(dim=-1)
        return [dict(zip(self.names, p.tolist())) for p in probs]


clip_verifier = None
if CLIP_VERIFY:
    try:
        clip_verifier = ClipVerifier()
    except Exception as exc:
        print(f"CLIP desactivado: {exc}")

# Con CLIP los falsos positivos se filtran después, así que el modelo puede ser menos exigente.
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.25" if clip_verifier else "0.5"))
CONF_BY_FRUIT = {
    fruit: float(os.getenv(f"CONF_{fruit.upper()}", default))
    for fruit, default in {
        "banana": CONF_THRESHOLD,
        "mango": CONF_THRESHOLD if clip_verifier else 0.6,
        "naranja": CONF_THRESHOLD,
        "tomate": CONF_THRESHOLD,
    }.items()
}

app = FastAPI(title="Sacred Fruit API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def imperfection_level(percentage: float) -> str:
    if percentage < 5:
        return "Leve"
    if percentage < 12:
        return "Moderada"
    return "Elevada"


def suggest_action(state: str, percentage: float) -> str:
    level = imperfection_level(percentage)
    if state == "VERDE":
        if level == "Elevada":
            return "Separar y seleccionar antes de almacenar"
        return "Almacenar en cámara y esperar la maduración"
    if state == "MADURO":
        if level == "Leve":
            return "Despacho inmediato a locales comerciales"
        if level == "Moderada":
            return "Venta rápida, priorizando la selección por calidad"
        return "Venta con descuento o desvío a industria"
    if level == "Elevada":
        return "Descarte o entrega a industria procesadora"
    return "Liquidar hoy para jugos o procesado"


def describe_imperfection(zones: int, percentage: float) -> str:
    if zones == 0:
        return "Sin zonas dañadas detectadas"
    noun = "zona dañada detectada" if zones == 1 else "zonas dañadas detectadas"
    return f"{zones} {noun} ({percentage:.1f} % de la superficie)"


def mask_polygons(mask: np.ndarray) -> list[list[list[float]]]:
    height, width = mask.shape
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    areas = [cv2.contourArea(c) for c in contours]
    total = sum(areas)
    if total <= 0:
        return []
    polygons = []
    for contour, area in sorted(zip(contours, areas), key=lambda x: -x[1]):
        if area < MIN_PART * total:
            break
        epsilon = 0.003 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        while len(approx) > MAX_POLYGON_POINTS:
            epsilon *= 1.5
            approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) >= 3:
            polygons.append([[round(float(x) / width, 4), round(float(y) / height, 4)] for x, y in approx[:, 0]])
    return polygons


def split_class(label: str):
    fruit, _, suffix = label.partition("_")
    return fruit, STATE_FROM_SUFFIX.get(suffix)


def class_name(fruit: str, state: str) -> str:
    suffix = {"VERDE": "verde", "MADURO": "madur", "SOBREPASADO": "sobrepasad"}[state]
    if state != "VERDE":
        suffix += "o" if fruit in MASCULINE else "a"
    return f"{fruit}_{suffix}"


def crop_box(image: Image.Image, box, margin: float = 0.1) -> Image.Image:
    width, height = image.size
    x1, y1, x2, y2 = box
    mx, my = (x2 - x1) * margin, (y2 - y1) * margin
    return image.crop((
        int(max(0, x1 - mx) * width),
        int(max(0, y1 - my) * height),
        int(min(1, x2 + mx) * width),
        int(min(1, y2 + my) * height),
    ))


def clip_check(fruit: str, scores: dict[str, float]):
    family = {f: scores[f] + sum(scores[r] for r in CLIP_RELATIVES.get(f, ())) for f in PROJECT_FRUITS}
    related = {r for rs in CLIP_RELATIVES.values() for r in rs}
    others = {k: v for k, v in scores.items() if k not in PROJECT_FRUITS and k not in related}
    best_fruit = max(family, key=family.get)
    best_other = max(others, key=others.get)
    info = {
        "winner": best_fruit if family[best_fruit] >= others[best_other] else best_other,
        "score": round(max(family[best_fruit], others[best_other]), 3),
        "fruit_score": round(family[fruit], 3),
    }
    if others[best_other] > family[best_fruit] and others[best_other] - family[fruit] > CLIP_MARGIN:
        return "reject", info
    if best_fruit != fruit and family[best_fruit] > CLIP_SWAP:
        return "swap", info
    return "ok", info


def load_image(raw: bytes) -> Image.Image:
    try:
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="La imagen no es válida.")
    if min(image.size) < 64:
        raise HTTPException(status_code=400, detail="La imagen es demasiado chica para analizarla.")
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    return image


def red_ratio(hsv: np.ndarray, mask: np.ndarray) -> float:
    h, s, v = hsv[..., 0][mask], hsv[..., 1][mask], hsv[..., 2][mask]
    hue = h[(s > 60) & (v > 50)]
    if hue.size == 0:
        return 0.0
    return float(np.mean((hue < 8) | (hue > 165)))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_PATH.name,
        "task": model.task,
        "classes": list(model.names.values()),
        "thresholds": {
            "conf": CONF_THRESHOLD,
            "conf_by_fruit": CONF_BY_FRUIT,
            "defect_conf": DEFECT_CONF,
            "min_area": MIN_AREA,
            "max_fill": MAX_FILL,
        },
        "clip": clip_verifier is not None,
    }


@app.post("/predict")
def predict(file: UploadFile = File(...), lot_id: str = Form(""), debug: bool = False):
    image = load_image(file.file.read())
    width, height = image.size

    conf_floor = min([DEFECT_CONF, *CONF_BY_FRUIT.values()])
    result = model.predict(image, conf=conf_floor, imgsz=IMG_SIZE, retina_masks=True, verbose=False)[0]
    if result.boxes is None or len(result.boxes) == 0 or result.masks is None:
        raise HTTPException(status_code=422, detail=NO_FRUIT)

    names = result.names
    labels = [names[int(c)] for c in result.boxes.cls.tolist()]
    confidences = result.boxes.conf.tolist()
    boxes = result.boxes.xyxyn.tolist()
    masks = result.masks.data.bool()
    if masks.shape[-2:] != (height, width):
        masks = torch.nn.functional.interpolate(masks[None].float(), size=(height, width))[0].bool()
    hsv = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2HSV)

    fruit_ids, discarded, corrections = [], [], []
    for i, label in enumerate(labels):
        fruit = split_class(label)[0]
        if label == DEFECT_CLASS or fruit not in CONF_BY_FRUIT:
            continue
        mask_px = int(masks[i].sum())
        x1, y1, x2, y2 = boxes[i]
        box_px = max(1.0, (x2 - x1) * width * (y2 - y1) * height)
        reason = None
        if confidences[i] < CONF_BY_FRUIT[fruit]:
            reason = "confianza"
        elif mask_px / (width * height) < MIN_AREA:
            reason = "area"
        elif mask_px / box_px > MAX_FILL:
            reason = "forma"
        if reason:
            discarded.append({"label": label, "confidence": round(confidences[i], 3), "reason": reason})
            continue
        if label in TOMATE_FROM_NARANJA:
            ratio = red_ratio(hsv, masks[i].cpu().numpy())
            if ratio > RED_SWAP:
                corrections.append({"from": label, "to": TOMATE_FROM_NARANJA[label], "red_ratio": round(ratio, 2)})
                labels[i] = TOMATE_FROM_NARANJA[label]
        fruit_ids.append(i)

    clip_info = {"enabled": clip_verifier is not None, "checked": 0, "ms": 0, "rejected": [], "corrections": []}
    if clip_verifier and fruit_ids:
        started = time.perf_counter()
        checked = sorted(fruit_ids, key=lambda i: -int(masks[i].sum()))[:CLIP_MAX_CROPS]
        scores = clip_verifier.classify([crop_box(image, boxes[i]) for i in checked])
        for i, score in zip(checked, scores):
            fruit, state = split_class(labels[i])
            verdict, info = clip_check(fruit, score)
            if verdict == "reject":
                fruit_ids.remove(i)
                discarded.append({"label": labels[i], "confidence": round(confidences[i], 3), "reason": "clip", **info})
                clip_info["rejected"].append({"label": labels[i], **info})
            elif verdict == "swap":
                new_label = class_name(info["winner"], state)
                clip_info["corrections"].append({"from": labels[i], "to": new_label, **info})
                labels[i] = new_label
        clip_info["checked"] = len(checked)
        clip_info["ms"] = round((time.perf_counter() - started) * 1000)

    discarded_by: dict[str, int] = {}
    for d in discarded:
        discarded_by[d["reason"]] = discarded_by.get(d["reason"], 0) + 1

    if not fruit_ids:
        content = {"detail": NO_FRUIT, "verification": {"discarded": len(discarded), "discarded_by": discarded_by, "clip": clip_info}}
        if debug:
            content["debug"] = {"discarded": discarded, "image_size": [width, height]}
        return JSONResponse(status_code=422, content=content)

    fruit_surface = torch.any(masks[fruit_ids], dim=0)
    total = int(fruit_surface.sum())
    defect_ids = [
        i for i, label in enumerate(labels)
        if label == DEFECT_CLASS and confidences[i] >= DEFECT_CONF and int((masks[i] & fruit_surface).sum()) > 0
    ]

    area_by_class: dict[str, float] = {}
    for i in fruit_ids:
        area_by_class[labels[i]] = area_by_class.get(labels[i], 0.0) + float(masks[i].sum())
    dominant = max(area_by_class, key=area_by_class.get)
    dominant_conf = [confidences[i] for i in fruit_ids if labels[i] == dominant]
    fruit_key, state = split_class(dominant)
    rules = FRUIT_RULES[fruit_key]

    if defect_ids and total > 0:
        damaged = torch.any(masks[defect_ids], dim=0) & fruit_surface
        imperfection = round(100.0 * int(damaged.sum()) / total, 1)
    else:
        imperfection = 0.0

    detections = []
    for i in fruit_ids + defect_ids:
        polygons = mask_polygons(masks[i].cpu().numpy())
        detections.append({
            "kind": "defecto" if labels[i] == DEFECT_CLASS else "fruta",
            "label": labels[i],
            "confidence": round(confidences[i], 3),
            "box": [round(v, 4) for v in boxes[i]],
            "polygon": polygons[0] if polygons else None,
            "polygons": polygons,
        })

    response = {
        "id": f"SCAN-{int(time.time() * 1000)}",
        "lot_id": lot_id.strip() or None,
        "fruit_type": rules["name"],
        "state": state,
        "confidence": round(sum(dominant_conf) / len(dominant_conf), 2),
        "imperfection_percentage": imperfection,
        "imperfection_details": describe_imperfection(len(defect_ids), imperfection),
        "shelf_life_days": rules["shelf_life"][state],
        "suggested_action": suggest_action(state, imperfection),
        "caliber": rules["caliber"],
        "estimated_weight": rules["weight"],
        "detections": detections,
        "verification": {
            "discarded": len(discarded),
            "discarded_by": discarded_by,
            "color_corrections": corrections,
            "clip": clip_info,
        },
    }
    if debug:
        response["debug"] = {"discarded": discarded, "image_size": [width, height]}
    return response
