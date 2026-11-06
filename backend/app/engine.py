import threading
import time
from dataclasses import dataclass

import cv2
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO

from .clip_verifier import ClipVerifier, clip_check, with_article
from .config import Settings
from .labels import DEFECT_CLASS, TOMATE_FROM_NARANJA, class_name, split_class
from .postprocess import count_reasons, crop_box, mask_polygons, red_ratio
from .rules import FRUIT_RULES, describe_imperfection, suggest_action

IMG_SIZE = 640
NO_FRUIT_HINT = "Encuadrá una banana, un mango, una naranja o un tomate, completo y con buena luz."


@dataclass
class Engine:
    settings: Settings
    model: YOLO
    fallback: YOLO | None = None
    clip: ClipVerifier | None = None
    clip_error: str | None = None

    def __post_init__(self):
        self.conf_by_fruit = self.settings.conf_by_fruit(self.clip is not None)
        self.started_at = time.time()
        self._lock = threading.Lock()

    @property
    def model_name(self) -> str:
        return self.settings.model_path.name

    @property
    def fallback_name(self) -> str | None:
        return self.settings.fallback_path.name if self.fallback is not None else None

    def warmup(self) -> None:
        blank = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (128, 128, 128))
        for mdl in filter(None, (self.model, self.fallback)):
            mdl.predict(blank, imgsz=IMG_SIZE, verbose=False)
        if self.clip is not None:
            self.clip.classify([blank])

    def analyze(self, mdl: YOLO, image: Image.Image):
        s = self.settings
        width, height = image.size
        conf_floor = min([s.defect_conf, *self.conf_by_fruit.values()])
        result = mdl.predict(image, conf=conf_floor, imgsz=IMG_SIZE, retina_masks=True, verbose=False)[0]
        clip_info = {"enabled": self.clip is not None, "checked": 0, "ms": 0, "rejected": [], "corrections": []}
        if result.boxes is None or len(result.boxes) == 0 or result.masks is None:
            return None, [], [], clip_info

        names = result.names
        labels = [names[int(c)] for c in result.boxes.cls.tolist()]
        confidences = result.boxes.conf.tolist()
        boxes = result.boxes.xyxyn.tolist()
        masks = result.masks.data.bool()
        if masks.shape[-2:] != (height, width):
            masks = torch.nn.functional.interpolate(masks[None].float(), size=(height, width))[0].bool()
        hsv = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2HSV)

        fruit_ids, discarded, corrections, kept, small = [], [], [], [], []
        for i, label in enumerate(labels):
            fruit = split_class(label)[0]
            if label == DEFECT_CLASS or fruit not in self.conf_by_fruit:
                continue
            mask_px = int(masks[i].sum())
            x1, y1, x2, y2 = boxes[i]
            box_px = max(1.0, (x2 - x1) * width * (y2 - y1) * height)
            reason = None
            if confidences[i] < self.conf_by_fruit[fruit]:
                reason = "confianza"
            elif mask_px / (width * height) < s.min_area:
                reason = "area"
            elif mask_px / box_px > s.max_fill:
                reason = "forma"
            if reason == "area":
                small.append(i)
                continue
            if reason:
                discarded.append({"label": label, "confidence": round(confidences[i], 3), "reason": reason})
                continue
            kept.append(i)

        # Un racimo se detecta como muchas frutas chicas: si juntas ocupan bastante de la foto, se conservan.
        if len(small) >= 3 and float(torch.any(masks[small], dim=0).sum()) / (width * height) >= s.min_cluster:
            kept.extend(small)
        else:
            discarded.extend({"label": labels[i], "confidence": round(confidences[i], 3), "reason": "area"} for i in small)

        for i in sorted(kept):
            label = labels[i]
            if label in TOMATE_FROM_NARANJA:
                ratio = red_ratio(hsv, masks[i].cpu().numpy())
                if ratio > s.red_swap:
                    corrections.append({"from": label, "to": TOMATE_FROM_NARANJA[label], "red_ratio": round(ratio, 2)})
                    labels[i] = TOMATE_FROM_NARANJA[label]
            fruit_ids.append(i)

        if self.clip is not None and fruit_ids:
            started = time.perf_counter()
            checked = sorted(fruit_ids, key=lambda i: -int(masks[i].sum()))[: s.clip_max_crops]
            scores = self.clip.classify([crop_box(image, boxes[i]) for i in checked])
            votes: dict[str, list[str | None]] = {}
            for i, score in zip(checked, scores):
                fruit, state = split_class(labels[i])
                verdict, info = clip_check(fruit, score, s.clip_margin, s.clip_swap)
                original = labels[i]
                if verdict == "reject":
                    fruit_ids.remove(i)
                    discarded.append({"label": labels[i], "confidence": round(confidences[i], 3), "reason": "clip", **info})
                    clip_info["rejected"].append({"label": labels[i], **info})
                    votes.setdefault(original, []).append(None)
                elif verdict == "swap":
                    new_label = class_name(info["winner"], state)
                    clip_info["corrections"].append({"from": labels[i], "to": new_label, **info})
                    labels[i] = new_label
                    votes.setdefault(original, []).append(new_label)
                else:
                    votes.setdefault(original, []).append(original)
            # Las detecciones que no entraron en el cupo de CLIP siguen lo que se decidió para su misma clase.
            # En un empate gana el voto de la detección más grande, que es la primera de la lista.
            for i in [i for i in fruit_ids if i not in checked and labels[i] in votes]:
                outcome = max(votes[labels[i]], key=votes[labels[i]].count)
                if outcome is None:
                    fruit_ids.remove(i)
                    discarded.append({"label": labels[i], "confidence": round(confidences[i], 3), "reason": "clip"})
                else:
                    labels[i] = outcome
            clip_info["checked"] = len(checked)
            clip_info["ms"] = round((time.perf_counter() - started) * 1000)

        if not fruit_ids:
            return None, discarded, corrections, clip_info
        return (labels, confidences, boxes, masks, fruit_ids), discarded, corrections, clip_info

    def predict(self, image: Image.Image, lot_id: str = "", debug: bool = False) -> tuple[bool, dict]:
        with self._lock:
            return self._predict(image, lot_id, debug)

    def _predict(self, image: Image.Image, lot_id: str, debug: bool) -> tuple[bool, dict]:
        width, height = image.size
        used = self.model_name
        tried = [used]
        found, discarded, corrections, clip_info = self.analyze(self.model, image)
        if found is None and self.fallback is not None:
            found, extra, corrections, clip_info = self.analyze(self.fallback, image)
            discarded += [{**d, "model": self.fallback_name} for d in extra]
            used = self.fallback_name
            tried.append(used)
        discarded_by = count_reasons(discarded)
        debug_info = {"discarded": discarded, "image_size": [width, height]}

        if found is None:
            code, detail = explain_no_fruit(discarded)
            body = {
                "detail": detail,
                "code": "sin_fruta",
                "reason": code,
                "hint": NO_FRUIT_HINT,
                "verification": {
                    "models_tried": tried,
                    "discarded": len(discarded),
                    "discarded_by": discarded_by,
                    "clip": clip_info,
                },
            }
            if debug:
                body["debug"] = debug_info
            return False, body

        labels, confidences, boxes, masks, fruit_ids = found
        fruit_surface = torch.any(masks[fruit_ids], dim=0)
        total = int(fruit_surface.sum())
        defect_ids = [
            i for i, label in enumerate(labels)
            if label == DEFECT_CLASS and confidences[i] >= self.settings.defect_conf and int((masks[i] & fruit_surface).sum()) > 0
        ]

        area_by_class: dict[str, float] = {}
        count_by_class: dict[str, int] = {}
        for i in fruit_ids:
            area_by_class[labels[i]] = area_by_class.get(labels[i], 0.0) + float(masks[i].sum())
            count_by_class[labels[i]] = count_by_class.get(labels[i], 0) + 1
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

        area_sum = sum(area_by_class.values())
        composition = [
            {
                "label": label,
                "fruit": FRUIT_RULES[split_class(label)[0]]["name"],
                "state": split_class(label)[1],
                "detections": count_by_class[label],
                "share": round(area / area_sum, 3),
            }
            for label, area in sorted(area_by_class.items(), key=lambda x: -x[1])
        ]

        body = {
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
            "composition": composition,
            "verification": {
                "model": used,
                "models_tried": tried,
                "discarded": len(discarded),
                "discarded_by": discarded_by,
                "color_corrections": corrections,
                "clip": clip_info,
            },
        }
        if debug:
            body["debug"] = debug_info
        return True, body


def explain_no_fruit(discarded: list[dict]) -> tuple[str, str]:
    if not discarded:
        return "sin_deteccion", "El modelo no encontró ninguna fruta en la foto."
    rejected = [d for d in discarded if d["reason"] == "clip" and "winner" in d]
    if rejected:
        winner = max(rejected, key=lambda r: r["score"])["winner"]
        return "no_es_fruta", (
            f"Lo que aparece en la foto parece {with_article(winner)}, "
            "no una de las cuatro frutas que reconoce el sistema."
        )
    reasons = count_reasons(discarded)
    main = max(reasons, key=reasons.get)
    if main == "clip":
        return "no_es_fruta", "Lo que aparece en la foto no parece una de las cuatro frutas que reconoce el sistema."
    if main == "area":
        return "muy_chica", "Se ve algo parecido a una fruta, pero ocupa muy poco de la foto."
    if main == "forma":
        return "forma", "Lo detectado tiene forma rectangular, como una pared o una caja, y no de fruta."
    return "confianza_baja", "Se ve algo parecido a una fruta, pero el modelo no está seguro de qué es."
