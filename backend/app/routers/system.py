import time

from fastapi import APIRouter, Request

from .. import __version__
from ..clip_verifier import CLIP_ARCH, CLIP_WEIGHTS
from ..engine import IMG_SIZE, Engine
from ..models import detector_info
from ..schemas import HealthResponse, ModelInfoResponse

router = APIRouter(tags=["Sistema"])

HEALTH_EXAMPLE = {
    "status": "ok",
    "version": __version__,
    "model": "best.pt",
    "clip": {"active": True, "requested": True, "error": None},
    "fallback": {"active": True, "file": "best_v2.pt"},
    "uptime_s": 42,
}


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Estado del servidor",
    description="Dice si el servidor está listo, si CLIP cargó y si hay modelo de respaldo. "
    "Si CLIP se pidió pero no pudo cargar (por ejemplo, sin internet), el estado es `degradado` "
    "y el servidor sigue respondiendo sin esa verificación.",
    responses={200: {"content": {"application/json": {"example": HEALTH_EXAMPLE}}}},
)
def health(request: Request):
    engine: Engine = request.app.state.engine
    s = engine.settings
    return {
        "status": "degradado" if s.clip_verify and engine.clip is None else "ok",
        "version": __version__,
        "model": engine.model_name,
        "clip": {"active": engine.clip is not None, "requested": s.clip_verify, "error": engine.clip_error},
        "fallback": {"active": engine.fallback is not None, "file": engine.fallback_name},
        "uptime_s": int(time.time() - engine.started_at),
    }


@router.get(
    "/model/info",
    response_model=ModelInfoResponse,
    summary="Modelos, clases y umbrales",
    description="Clases y versión del modelo principal y del respaldo, umbrales activos, configuración de CLIP y límites de subida.",
)
def model_info(request: Request):
    engine: Engine = request.app.state.engine
    s = engine.settings
    return {
        "api_version": __version__,
        "model": detector_info(engine.model, s.model_path, s.model_version),
        "fallback": detector_info(engine.fallback, s.fallback_path) if engine.fallback is not None else None,
        "thresholds": {
            "conf_by_fruit": engine.conf_by_fruit,
            "defect_conf": s.defect_conf,
            "min_area": s.min_area,
            "min_cluster": s.min_cluster,
            "max_fill": s.max_fill,
            "red_swap": s.red_swap,
        },
        "clip": {
            "active": engine.clip is not None,
            "architecture": CLIP_ARCH,
            "weights": CLIP_WEIGHTS,
            "max_crops": s.clip_max_crops,
            "margin": s.clip_margin,
            "swap": s.clip_swap,
            "error": engine.clip_error,
        },
        "limits": {
            "max_upload_mb": s.max_upload_mb,
            "max_pixels": s.max_pixels,
            "max_side": s.max_side,
            "image_size": IMG_SIZE,
        },
    }
