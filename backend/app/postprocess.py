import cv2
import numpy as np
from PIL import Image

MAX_POLYGON_POINTS = 80
MIN_PART = 0.05


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


def red_ratio(hsv: np.ndarray, mask: np.ndarray) -> float:
    h, s, v = hsv[..., 0][mask], hsv[..., 1][mask], hsv[..., 2][mask]
    hue = h[(s > 60) & (v > 50)]
    if hue.size == 0:
        return 0.0
    return float(np.mean((hue < 8) | (hue > 165)))


def count_reasons(discarded: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for d in discarded:
        counts[d["reason"]] = counts.get(d["reason"], 0) + 1
    return counts
