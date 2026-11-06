import io
import warnings

import cv2
import numpy as np
from PIL import Image, ImageOps

from .errors import ApiError

MIN_SIDE = 64
DARK_BELOW = 0.18
BLURRY_BELOW = 8.0

Image.MAX_IMAGE_PIXELS = None


def _looks_like_image(raw: bytes) -> str | None:
    head = raw[:16]
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if head.startswith(b"BM"):
        return "bmp"
    if head.startswith((b"II*\x00", b"MM\x00*")):
        return "tiff"
    if head[4:8] == b"ftyp":
        return "heic" if head[8:12] in {b"heic", b"heix", b"mif1", b"msf1", b"hevc"} else "avif"
    return None


def load_image(raw: bytes, max_side: int, max_pixels: int) -> Image.Image:
    if not raw:
        raise ApiError(400, "archivo_vacio", "El archivo llegó vacío.", "Volvé a sacar la foto o elegí otra.")
    kind = _looks_like_image(raw)
    if kind is None:
        raise ApiError(415, "no_es_imagen", "El archivo no es una imagen.", "Subí una foto en JPG, PNG o WEBP.")
    if kind in {"heic", "avif"}:
        raise ApiError(415, "formato_no_soportado", f"El formato {kind.upper()} no es compatible.",
                       "Sacá la foto desde la app o convertila a JPG.")
    try:
        image = Image.open(io.BytesIO(raw))
        width, height = image.size
    except Exception:
        raise ApiError(400, "imagen_corrupta", "La imagen está dañada y no se puede abrir.", "Probá con otra foto.")
    if width * height > max_pixels:
        raise ApiError(413, "imagen_muy_grande",
                       f"La imagen tiene {width * height / 1e6:.0f} megapíxeles y el máximo es {max_pixels / 1e6:.0f}.",
                       "Achicá la foto o sacala con menos resolución.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            image = ImageOps.exif_transpose(image).convert("RGB")
    except Exception:
        raise ApiError(400, "imagen_corrupta", "La imagen está dañada o incompleta.", "Probá con otra foto.")
    if min(image.size) < MIN_SIDE:
        raise ApiError(400, "imagen_chica", "La imagen es demasiado chica para analizarla.",
                       f"Tiene que medir al menos {MIN_SIDE} píxeles de lado.")
    image.thumbnail((max_side, max_side))
    return image


def image_quality(image: Image.Image) -> dict:
    small = image.copy()
    small.thumbnail((512, 512))
    gray = np.asarray(small.convert("L"), dtype=np.float32)
    brightness = float(gray.mean() / 255)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_32F).var())
    issues = []
    if brightness < DARK_BELOW:
        issues.append("oscura")
    if sharpness < BLURRY_BELOW:
        issues.append("borrosa")
    return {"brightness": round(brightness, 3), "sharpness": round(sharpness, 1), "issues": issues}
