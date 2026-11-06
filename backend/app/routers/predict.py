import time

from fastapi import APIRouter, File, Form, Query, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from ..engine import Engine
from ..errors import ApiError
from ..images import image_quality, load_image
from ..schemas import ErrorResponse, NoFruitResponse, PredictResponse

router = APIRouter(tags=["Análisis"])

OK_EXAMPLE = {
    "id": "SCAN-1762430000000",
    "lot_id": "LOTE-1234",
    "fruit_type": "Banana",
    "state": "MADURO",
    "confidence": 0.91,
    "imperfection_percentage": 0.0,
    "imperfection_details": "Sin zonas dañadas detectadas",
    "shelf_life_days": "2 a 4 días",
    "suggested_action": "Despacho inmediato a locales comerciales",
    "caliber": "Calibre A (más de 20 cm)",
    "estimated_weight": "Caja estándar 18 kg",
    "detections": [{
        "kind": "fruta", "label": "banana_madura", "confidence": 0.912,
        "box": [0.12, 0.2, 0.88, 0.8],
        "polygon": [[0.12, 0.4], [0.3, 0.22], [0.5, 0.6]],
        "polygons": [[[0.12, 0.4], [0.3, 0.22], [0.5, 0.6]]],
    }],
    "composition": [{"label": "banana_madura", "fruit": "Banana", "state": "MADURO", "detections": 1, "share": 1.0}],
    "verification": {
        "model": "best.pt", "models_tried": ["best.pt"], "discarded": 1, "discarded_by": {"clip": 1},
        "color_corrections": [],
        "clip": {"enabled": True, "checked": 2, "ms": 95, "rejected": [], "corrections": []},
    },
    "quality": {"brightness": 0.52, "sharpness": 310.4, "issues": []},
    "elapsed_ms": 480,
}
NO_FRUIT_EXAMPLE = {
    "detail": "Lo que aparece en la foto parece una pelota, no una de las cuatro frutas que reconoce el sistema.",
    "code": "sin_fruta",
    "reason": "no_es_fruta",
    "hint": "Encuadrá una banana, un mango, una naranja o un tomate, completo y con buena luz.",
    "verification": {
        "models_tried": ["best.pt", "best_v2.pt"], "discarded": 2, "discarded_by": {"clip": 2},
        "clip": {"enabled": True, "checked": 1, "ms": 80,
                 "rejected": [{"label": "naranja_madura", "winner": "pelota", "score": 0.81, "fruit_score": 0.12}],
                 "corrections": []},
    },
    "quality": {"brightness": 0.61, "sharpness": 220.0, "issues": []},
    "elapsed_ms": 650,
}


def _error_example(code: str, detail: str, hint: str) -> dict:
    return {"model": ErrorResponse, "content": {"application/json": {"example": {"detail": detail, "code": code, "hint": hint}}}}


@router.post(
    "/predict",
    response_model=PredictResponse,
    response_model_exclude_unset=True,
    summary="Analizar una foto",
    description=(
        "Recibe una foto en `multipart/form-data` (campo `file`) y devuelve la fruta dominante, su estado de madurez, "
        "las máscaras de cada fruta y de las zonas dañadas, la vida útil y la recomendación logística.\n\n"
        "Pasos: modelo principal → filtros (confianza, área, forma, color) → verificación con CLIP. "
        "Si el principal no deja ninguna fruta, se prueba con el modelo de respaldo.\n\n"
        "Con `debug=true` la respuesta suma la lista de detecciones descartadas y el motivo de cada una."
    ),
    responses={
        200: {"content": {"application/json": {"example": OK_EXAMPLE}}},
        400: _error_example("imagen_corrupta", "La imagen está dañada y no se puede abrir.", "Probá con otra foto."),
        413: _error_example("archivo_muy_grande", "La imagen pesa 14.2 MB y el máximo es 10 MB.", "Achicá la foto o sacala con menos resolución."),
        415: _error_example("no_es_imagen", "El archivo no es una imagen.", "Subí una foto en JPG, PNG o WEBP."),
        422: {"model": NoFruitResponse, "description": "No se encontró ninguna fruta", "content": {"application/json": {"example": NO_FRUIT_EXAMPLE}}},
    },
)
async def predict(
    request: Request,
    file: UploadFile = File(..., description="Foto JPG, PNG o WEBP"),
    lot_id: str = Form("", description="Número de lote, opcional"),
    debug: bool = Query(False, description="Agrega las detecciones descartadas y el motivo"),
):
    started = time.perf_counter()
    engine: Engine = request.app.state.engine
    limit = int(engine.settings.max_upload_mb * 1024 * 1024)
    raw = await file.read(limit + 1)
    if len(raw) > limit:
        size = (file.size or len(raw)) / 1024 / 1024
        raise ApiError(413, "archivo_muy_grande",
                       f"La imagen pesa {size:.1f} MB y el máximo es {engine.settings.max_upload_mb:g} MB.",
                       "Achicá la foto o sacala con menos resolución.")

    def run():
        image = load_image(raw, engine.settings.max_side, engine.settings.max_pixels)
        found, body = engine.predict(image, lot_id, debug)
        body["quality"] = image_quality(image)
        return found, body

    found, body = await run_in_threadpool(run)
    body["elapsed_ms"] = round((time.perf_counter() - started) * 1000)
    if not found:
        return JSONResponse(status_code=422, content=body)
    return body
