import logging
import re
from pathlib import Path

from ultralytics import YOLO

from .clip_verifier import ClipVerifier
from .config import Settings

log = logging.getLogger("sacred_fruit")


def load_detector(path: Path) -> YOLO:
    if not path.is_file():
        raise FileNotFoundError(f"No se encontró el modelo en {path}")
    return YOLO(str(path))


def load_fallback(settings: Settings) -> YOLO | None:
    path = settings.fallback_path
    if path is None or not path.is_file() or path.resolve() == settings.model_path.resolve():
        return None
    return YOLO(str(path))


def load_clip(settings: Settings) -> tuple[ClipVerifier | None, str | None]:
    if not settings.clip_verify:
        return None, "Desactivado con CLIP_VERIFY=0"
    try:
        return ClipVerifier(), None
    except Exception as exc:
        log.warning("CLIP desactivado: %s", exc)
        return None, f"{type(exc).__name__}: {exc}"[:300]


def detector_info(model: YOLO, path: Path, version: str | None = None) -> dict:
    ckpt = getattr(model, "ckpt", None) or {}
    args = ckpt.get("train_args") or {}
    match = re.search(r"_(v\d+)$", path.stem)
    return {
        "file": path.name,
        "version": version or (match.group(1) if match else None),
        "task": model.task,
        "trained_at": ckpt.get("date"),
        "ultralytics_version": ckpt.get("version"),
        "epochs": args.get("epochs"),
        "classes": list(model.names.values()),
    }
