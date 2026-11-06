import io

from fastapi.testclient import TestClient
from PIL import Image, ImageEnhance

from app import models
from app.config import Settings
from app.main import create_app
from app.schemas import ErrorResponse, HealthResponse, ModelInfoResponse, NoFruitResponse, PredictResponse

from .conftest import encode


def post(client, data: bytes, name="foto.jpg", mime="image/jpeg", **params):
    return client.post("/predict", params=params, files={"file": (name, data, mime)}, data={"lot_id": "LOTE-TEST"})


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = HealthResponse.model_validate(res.json())
    assert body.status == "ok"
    assert body.model == "best.pt"
    assert body.clip.active
    assert body.fallback.active and body.fallback.file == "best_v2.pt"
    assert "X-Process-Time-Ms" in res.headers


def test_model_info(client):
    res = client.get("/model/info")
    assert res.status_code == 200
    info = ModelInfoResponse.model_validate(res.json())
    assert len(info.model.classes) == 13
    assert "defecto" in info.model.classes
    assert info.model.version == "v4"
    assert info.fallback is not None and info.fallback.version == "v2"
    assert set(info.thresholds.conf_by_fruit) == {"banana", "mango", "naranja", "tomate"}
    assert info.clip.active and info.clip.architecture == "ViT-B-32"


def test_foto_con_fruta(client, photo):
    res = post(client, photo("banana_madura_01.jpg"))
    assert res.status_code == 200
    body = res.json()
    assert body["fruit_type"] == "Banana"
    assert body["state"] == "MADURO"
    assert body["lot_id"] == "LOTE-TEST"
    assert body["verification"]["model"] == "best.pt"
    assert body["elapsed_ms"] > 0
    assert "debug" not in body


def test_contrato_de_la_respuesta(client, photo):
    body = post(client, photo("tomate_maduro_01.jpg"), debug="true").json()
    parsed = PredictResponse.model_validate(body)
    assert parsed.debug is not None and parsed.debug.image_size[0] > 0
    assert set(body) >= {
        "id", "lot_id", "fruit_type", "state", "confidence", "imperfection_percentage", "imperfection_details",
        "shelf_life_days", "suggested_action", "caliber", "estimated_weight", "detections", "composition",
        "verification", "quality", "elapsed_ms",
    }
    assert 0 <= body["confidence"] <= 1
    assert body["detections"] and all(d["kind"] in {"fruta", "defecto"} for d in body["detections"])
    for d in body["detections"]:
        assert len(d["box"]) == 4 and all(0 <= v <= 1 for v in d["box"])
        assert all(0 <= x <= 1 and 0 <= y <= 1 for poly in d["polygons"] for x, y in poly)
    assert abs(sum(c["share"] for c in body["composition"]) - 1) < 0.01
    assert body["composition"][0]["fruit"] == body["fruit_type"]


def test_foto_sin_fruta(client, photo):
    res = post(client, photo("pared_01.jpg"))
    assert res.status_code == 422
    body = NoFruitResponse.model_validate(res.json())
    assert body.code == "sin_fruta"
    assert body.reason in {"sin_deteccion", "forma"}
    assert body.detail and body.hint
    assert body.verification.models_tried == ["best.pt", "best_v2.pt"]


def test_objeto_que_no_es_fruta(client, photo):
    res = post(client, photo("obj_pelota_01.jpg"))
    assert res.status_code == 422
    body = res.json()
    assert body["reason"] == "no_es_fruta"
    assert "pelota" in body["detail"]


def test_archivo_que_no_es_imagen(client):
    res = post(client, b"esto es un texto, no una foto", name="notas.txt", mime="text/plain")
    assert res.status_code == 415
    assert ErrorResponse.model_validate(res.json()).code == "no_es_imagen"


def test_imagen_corrupta(client, photo):
    res = post(client, photo("banana_madura_01.jpg")[:600])
    assert res.status_code == 400
    assert res.json()["code"] == "imagen_corrupta"


def test_archivo_vacio(client):
    res = post(client, b"")
    assert res.status_code == 400
    assert res.json()["code"] == "archivo_vacio"


def test_imagen_demasiado_pesada(client):
    res = post(client, b"\xff\xd8\xff" + b"0" * (11 * 1024 * 1024))
    assert res.status_code == 413
    assert res.json()["code"] == "archivo_muy_grande"


def test_imagen_con_demasiados_pixeles(client):
    data = encode(Image.new("RGB", (7000, 7000), (90, 140, 60)), "PNG")
    assert len(data) < 10 * 1024 * 1024
    res = post(client, data, name="gigante.png", mime="image/png")
    assert res.status_code == 413
    assert res.json()["code"] == "imagen_muy_grande"


def test_imagen_demasiado_chica(client):
    res = post(client, encode(Image.new("RGB", (40, 40), "white")))
    assert res.status_code == 400
    assert res.json()["code"] == "imagen_chica"


def test_falta_el_archivo(client):
    res = client.post("/predict", data={"lot_id": "x"})
    assert res.status_code == 400
    assert res.json()["code"] == "solicitud_invalida"


def test_foto_oscura_se_avisa(client, photo):
    image = Image.open(io.BytesIO(photo("naranja_madura_01.jpg"))).convert("RGB")
    res = post(client, encode(ImageEnhance.Brightness(image).enhance(0.15)))
    assert res.status_code in {200, 422}
    assert "oscura" in res.json()["quality"]["issues"]


def test_sigue_andando_sin_clip(monkeypatch, photo):
    def sin_internet():
        raise OSError("No se pudo descargar el modelo")

    monkeypatch.setattr(models, "ClipVerifier", sin_internet)
    app = create_app(Settings(warmup=False))
    with TestClient(app) as client:
        health = client.get("/health").json()
        assert health["status"] == "degradado"
        assert not health["clip"]["active"] and "descargar" in health["clip"]["error"]
        res = post(client, photo("banana_madura_01.jpg"))
        assert res.status_code == 200
        assert res.json()["verification"]["clip"]["enabled"] is False
