import io
import os
import time
from pathlib import Path

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

MODEL_PATH = Path(os.getenv("MODEL_PATH", Path(__file__).resolve().parent.parent / "best.pt"))
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.25"))
IMG_SIZE = 640
MAX_POLYGON_POINTS = 80
DEFECT_CLASS = "defecto"

STATE_FROM_SUFFIX = {
    "verde": "VERDE",
    "madura": "MADURO",
    "maduro": "MADURO",
    "sobrepasada": "SOBREPASADO",
    "sobrepasado": "SOBREPASADO",
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

model = YOLO(str(MODEL_PATH))

app = FastAPI(title="Sacred Fruit API", version="1.0.0")
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


def polygon_area(points) -> float:
    area = 0.0
    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2


def simplify(points) -> list[list[float]]:
    step = max(1, len(points) // MAX_POLYGON_POINTS)
    return [[round(float(x), 4), round(float(y), 4)] for x, y in points[::step]]


def split_class(label: str):
    fruit, _, suffix = label.partition("_")
    return fruit, STATE_FROM_SUFFIX.get(suffix)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_PATH.name,
        "task": model.task,
        "classes": list(model.names.values()),
    }


@app.post("/predict")
def predict(file: UploadFile = File(...), lot_id: str = Form("")):
    try:
        image = Image.open(io.BytesIO(file.file.read())).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="La imagen no es válida.")

    result = model.predict(image, conf=CONF_THRESHOLD, imgsz=IMG_SIZE, verbose=False)[0]
    if result.boxes is None or len(result.boxes) == 0:
        raise HTTPException(status_code=422, detail="El modelo no detectó ninguna fruta en la imagen.")

    names = result.names
    labels = [names[int(c)] for c in result.boxes.cls.tolist()]
    confidences = result.boxes.conf.tolist()
    boxes = result.boxes.xyxyn.tolist()
    polygons = result.masks.xyn if result.masks is not None else [None] * len(labels)

    fruit_ids = [i for i, label in enumerate(labels) if label != DEFECT_CLASS and split_class(label)[1]]
    defect_ids = [i for i, label in enumerate(labels) if label == DEFECT_CLASS]
    if not fruit_ids:
        raise HTTPException(status_code=422, detail="El modelo solo detectó defectos, no encontró ninguna fruta.")

    def area_of(i: int) -> float:
        polygon = polygons[i]
        if polygon is not None and len(polygon) >= 3:
            return polygon_area(polygon)
        x1, y1, x2, y2 = boxes[i]
        return (x2 - x1) * (y2 - y1)

    area_by_class: dict[str, float] = {}
    for i in fruit_ids:
        area_by_class[labels[i]] = area_by_class.get(labels[i], 0.0) + area_of(i)
    dominant = max(area_by_class, key=area_by_class.get)
    dominant_conf = [confidences[i] for i in fruit_ids if labels[i] == dominant]

    fruit_key, state = split_class(dominant)
    rules = FRUIT_RULES[fruit_key]

    # % de imperfección = superficie dañada dentro de la fruta / superficie total de fruta.
    if result.masks is not None:
        masks = result.masks.data.bool()
        fruit_surface = torch.any(masks[fruit_ids], dim=0)
        total = int(fruit_surface.sum())
        if defect_ids and total > 0:
            damaged = torch.any(masks[defect_ids], dim=0) & fruit_surface
            imperfection = 100.0 * int(damaged.sum()) / total
        else:
            imperfection = 0.0
    else:
        total = sum(area_of(i) for i in fruit_ids)
        damaged = sum(area_of(i) for i in defect_ids)
        imperfection = min(100.0, 100.0 * damaged / total) if total > 0 else 0.0
    imperfection = round(imperfection, 1)

    detections = [
        {
            "kind": "defecto" if labels[i] == DEFECT_CLASS else "fruta",
            "label": labels[i],
            "confidence": round(confidences[i], 3),
            "box": [round(v, 4) for v in boxes[i]],
            "polygon": simplify(polygons[i]) if polygons[i] is not None and len(polygons[i]) >= 3 else None,
        }
        for i in fruit_ids + defect_ids
    ]

    return {
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
    }
