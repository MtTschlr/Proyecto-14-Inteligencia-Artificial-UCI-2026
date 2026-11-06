"""Copia las fotos de muestra a public/muestras y guarda el resultado real del modelo para cada una.

La app usa ese resultado solo cuando el servidor no responde, y lo muestra marcado como guardado.
"""
import json
import re
import shutil
import sys
import time
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import ROOT  # noqa: E402
from app.main import create_app  # noqa: E402

IMAGES = ROOT / "backend" / "tests" / "imagenes"
OUT = ROOT / "public" / "muestras"
SAMPLES = [
    ("banana-madura", "Banana madura", "positivas/banana_madura_01.jpg"),
    ("racimo-pasado", "Racimo pasado", "positivas/banana_sobrepasada_01.jpg"),
    ("mango-maduro", "Mango maduro", "positivas/mango_maduro_01.jpg"),
    ("mango-verde", "Mango verde", "positivas/mango_verde_01.jpg"),
    ("naranjas", "Naranjas", "positivas/naranja_madura_01.jpg"),
    ("tomates", "Tomates en rama", "positivas/tomate_maduro_02.jpg"),
    ("tomate-podrido", "Tomate con hongos", "positivas/tomate_sobrepasado_01.jpg"),
    ("pelota", "Una pelota", "negativas/obj_pelota_01.jpg"),
]


def credits() -> dict[str, dict]:
    rows = {}
    for line in (IMAGES / "FUENTES.md").read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) == 4 and cells[0].endswith(".jpg"):
            match = re.match(r"\[(.+)\]\((.+)\)", cells[1])
            rows[cells[0]] = {"title": match.group(1), "url": match.group(2), "author": cells[2], "license": cells[3]}
    return rows


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sources = credits()
    items = []
    with TestClient(create_app()) as client:
        for sample_id, name, rel in SAMPLES:
            target = OUT / f"{sample_id}.jpg"
            shutil.copyfile(IMAGES / rel, target)
            with open(target, "rb") as f:
                res = client.post("/predict", params={"debug": "true"}, files={"file": (target.name, f, "image/jpeg")},
                                  data={"lot_id": "MUESTRA"})
            items.append({
                "id": sample_id,
                "name": name,
                "file": f"/muestras/{target.name}",
                "credit": sources.get(rel),
                "status": res.status_code,
                "result": res.json(),
            })
            print(f"{sample_id:16s} {res.status_code} {res.json().get('fruit_type') or res.json().get('reason')}")
    payload = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "samples": items}
    (OUT / "muestras.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
