FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/opt/hf \
    YOLO_CONFIG_DIR=/tmp/ultralytics \
    MPLCONFIGDIR=/tmp/matplotlib

# OpenCV (lo trae Ultralytics) necesita estas dos bibliotecas del sistema.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# PyTorch para CPU desde su índice propio: la versión de PyPI trae CUDA y pesa varios GB.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.15.0 torchvision==0.29.2

COPY requirements.txt .
RUN pip install -r requirements.txt

# Los pesos de CLIP se bajan ahora, así el contenedor arranca sin internet.
RUN python -c "import open_clip; open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')"

COPY app ./app

RUN useradd --system --uid 10001 --no-create-home sacred \
    && chmod -R a+rX /opt/hf /app

ENV HF_HUB_OFFLINE=1 \
    MODEL_PATH=/models/best.pt \
    FALLBACK_MODEL_PATH=/models/best_v2.pt

USER sacred
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=5 \
    CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
