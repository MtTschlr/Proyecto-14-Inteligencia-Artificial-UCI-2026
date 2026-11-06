from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

State = Literal["VERDE", "MADURO", "SOBREPASADO"]
Point = list[float]


class ErrorResponse(BaseModel):
    detail: str = Field(description="Mensaje para mostrar en la app")
    code: str = Field(description="Código fijo del error, para que la app elija qué pantalla mostrar")
    hint: str | None = Field(None, description="Qué puede hacer el usuario para resolverlo")


class Detection(BaseModel):
    kind: Literal["fruta", "defecto"]
    label: str = Field(description="Clase del modelo, por ejemplo banana_madura o defecto")
    confidence: float
    box: list[float] = Field(description="x1, y1, x2, y2 normalizados entre 0 y 1")
    polygon: list[Point] | None = Field(description="Contorno de la parte más grande de la máscara")
    polygons: list[list[Point]] = Field(description="Un contorno por cada parte de la máscara")


class ClipVerdict(BaseModel):
    label: str
    winner: str = Field(description="Lo que CLIP cree que hay en el recorte")
    score: float
    fruit_score: float


class ClipCorrection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_: str = Field(alias="from")
    to: str
    winner: str
    score: float
    fruit_score: float


class ColorCorrection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_: str = Field(alias="from")
    to: str
    red_ratio: float


class ClipInfo(BaseModel):
    enabled: bool
    checked: int = Field(description="Cuántas detecciones revisó CLIP")
    ms: int
    rejected: list[ClipVerdict]
    corrections: list[ClipCorrection]


class Verification(BaseModel):
    model: str = Field(description="Archivo del modelo que dio la respuesta")
    models_tried: list[str]
    discarded: int
    discarded_by: dict[str, int] = Field(description="Descartes por filtro: confianza, area, forma, clip")
    color_corrections: list[ColorCorrection]
    clip: ClipInfo


class NoFruitVerification(BaseModel):
    models_tried: list[str]
    discarded: int
    discarded_by: dict[str, int]
    clip: ClipInfo


class CompositionItem(BaseModel):
    label: str
    fruit: str
    state: State
    detections: int
    share: float = Field(description="Parte de la superficie de fruta que ocupa esta clase, de 0 a 1")


class Quality(BaseModel):
    brightness: float = Field(description="Brillo medio de 0 a 1")
    sharpness: float = Field(description="Varianza del Laplaciano; valores bajos indican foto movida")
    issues: list[Literal["oscura", "borrosa"]]


class DiscardedItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    label: str
    confidence: float
    reason: Literal["confianza", "area", "forma", "clip"]
    model: str | None = Field(None, description="Presente si lo descartó el modelo de respaldo")


class DebugInfo(BaseModel):
    discarded: list[DiscardedItem]
    image_size: list[int]


class PredictResponse(BaseModel):
    id: str
    lot_id: str | None
    fruit_type: str
    state: State
    confidence: float
    imperfection_percentage: float
    imperfection_details: str
    shelf_life_days: str
    suggested_action: str
    caliber: str
    estimated_weight: str
    detections: list[Detection]
    composition: list[CompositionItem] = Field(description="Clases de fruta encontradas, de mayor a menor superficie")
    verification: Verification
    quality: Quality
    elapsed_ms: int = Field(description="Tiempo total en el servidor, en milisegundos")
    debug: DebugInfo | None = None


class NoFruitResponse(ErrorResponse):
    reason: Literal["sin_deteccion", "no_es_fruta", "muy_chica", "forma", "confianza_baja"]
    verification: NoFruitVerification
    quality: Quality
    elapsed_ms: int
    debug: DebugInfo | None = None


class ClipStatus(BaseModel):
    active: bool
    requested: bool
    error: str | None


class FallbackStatus(BaseModel):
    active: bool
    file: str | None


class HealthResponse(BaseModel):
    status: Literal["ok", "degradado"] = Field(description="degradado si CLIP se pidió pero no pudo cargar")
    version: str
    model: str
    clip: ClipStatus
    fallback: FallbackStatus
    uptime_s: int


class DetectorInfo(BaseModel):
    file: str
    version: str | None
    task: str
    trained_at: str | None
    ultralytics_version: str | None
    epochs: int | None
    classes: list[str]


class Thresholds(BaseModel):
    conf_by_fruit: dict[str, float]
    defect_conf: float
    min_area: float
    min_cluster: float
    max_fill: float
    red_swap: float


class ClipConfig(BaseModel):
    active: bool
    architecture: str
    weights: str
    max_crops: int
    margin: float
    swap: float
    error: str | None


class Limits(BaseModel):
    max_upload_mb: float
    max_pixels: int
    max_side: int
    image_size: int


class ModelInfoResponse(BaseModel):
    api_version: str
    model: DetectorInfo
    fallback: DetectorInfo | None
    thresholds: Thresholds
    clip: ClipConfig
    limits: Limits
