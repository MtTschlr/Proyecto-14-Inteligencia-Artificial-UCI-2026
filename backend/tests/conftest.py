import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app

IMAGES = Path(__file__).resolve().parent / "imagenes"


@pytest.fixture(scope="session")
def client():
    with TestClient(create_app()) as c:
        yield c


@pytest.fixture
def photo():
    def read(name: str) -> bytes:
        return next(IMAGES.rglob(name)).read_bytes()
    return read


def encode(image: Image.Image, fmt: str = "JPEG") -> bytes:
    buf = io.BytesIO()
    image.save(buf, fmt)
    return buf.getvalue()
