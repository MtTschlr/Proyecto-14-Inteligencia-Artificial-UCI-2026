import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import Settings
from .engine import Engine
from .errors import install_handlers
from .models import load_clip, load_detector, load_fallback
from .routers import predict, system

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("sacred_fruit")

DESCRIPTION = """
API de **Sacred Fruit**. Detecta banana, mango, naranja o tomate en una foto, su estado de madurez
(verde, maduro o sobrepasado) y las zonas dañadas, y calcula vida útil y recomendación logística.

Todos los errores devuelven `detail` (mensaje para la app), `code` (código fijo) y `hint` (qué hacer).
"""


def build_engine(settings: Settings) -> Engine:
    started = time.perf_counter()
    model = load_detector(settings.model_path)
    fallback = load_fallback(settings)
    clip, clip_error = load_clip(settings)
    engine = Engine(settings, model, fallback, clip, clip_error)
    if settings.warmup:
        engine.warmup()
    log.info(
        "Modelos listos en %.1f s: %s, respaldo %s, CLIP %s",
        time.perf_counter() - started, engine.model_name, engine.fallback_name or "no", "sí" if clip else f"no ({clip_error})",
    )
    return engine


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.engine = engine or build_engine(settings)
        yield

    app = FastAPI(
        title="Sacred Fruit API",
        version=__version__,
        description=DESCRIPTION,
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Análisis", "description": "Clasificación de la foto"},
            {"name": "Sistema", "description": "Estado del servidor y de los modelos"},
        ],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Process-Time-Ms"],
    )

    @app.middleware("http")
    async def process_time(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Process-Time-Ms"] = str(round((time.perf_counter() - started) * 1000))
        return response

    install_handlers(app)
    app.include_router(predict.router)
    app.include_router(system.router)
    return app


app = create_app()
