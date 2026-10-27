import argparse
import os
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser(description="Pasa las fotos de tests/imagenes por /predict y arma una tabla.")
parser.add_argument("model", nargs="?", help="Modelo a probar (por defecto ../best.pt)")
parser.add_argument("--conf", action="append", default=[], help="Umbral general (0.45) o por fruta (mango=0.7). Se puede repetir.")
parser.add_argument("--no-clip", action="store_true", help="Desactiva la verificación con CLIP")
parser.add_argument("--out", default=str(Path(__file__).resolve().parent / "tests" / "resultados.md"))
args = parser.parse_args()

if args.model:
    os.environ["MODEL_PATH"] = args.model
for value in args.conf:
    fruit, _, conf = value.rpartition("=")
    os.environ[f"CONF_{fruit.upper()}" if fruit else "CONF_THRESHOLD"] = conf
if args.no_clip:
    os.environ["CLIP_VERIFY"] = "0"

from fastapi.testclient import TestClient  # noqa: E402

from main import CONF_BY_FRUIT, MODEL_PATH, STATE_FROM_SUFFIX, app, clip_verifier  # noqa: E402

BASE = Path(__file__).resolve().parent / "tests" / "imagenes"
client = TestClient(app)


def expected_from(path: Path, kind: str):
    if kind == "negativas":
        return None, None, False
    parts = path.stem.split("_")
    return parts[0], STATE_FROM_SUFFIX.get(parts[1]) if len(parts) > 1 else None, "manchas" in parts


rows, discards = [], Counter()
stats = Counter()
for kind in ("positivas", "negativas"):
    for path in sorted(p for p in (BASE / kind).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}):
        with open(path, "rb") as f:
            res = client.post("/predict", files={"file": (path.name, f, "image/jpeg")})
        data = res.json()
        verification = data.get("verification", {})
        by_filter = verification.get("discarded_by", {})
        discards.update(by_filter)
        fruit_exp, state_exp, defect_exp = expected_from(path, kind)

        if res.status_code == 200:
            fruit, state, conf = data["fruit_type"].lower(), data["state"], data["confidence"]
            zones = sum(d["kind"] == "defecto" for d in data["detections"])
            got = f"{fruit} {state} ({conf:.2f})"
        elif res.status_code == 422:
            fruit = state = None
            zones = 0
            got = "sin fruta (422)"
        else:
            res.raise_for_status()

        fruit_ok = fruit == fruit_exp
        state_ok = fruit_ok and (state_exp is None or state == state_exp)
        if kind == "positivas":
            stats["pos"] += 1
            stats["pos_fruit"] += fruit_ok
            stats["pos_state"] += state_ok
            if defect_exp:
                stats["defect_exp"] += 1
                stats["defect_found"] += zones > 0
        else:
            stats["neg"] += 1
            stats["neg_ok"] += fruit_ok

        expected = "sin fruta" if kind == "negativas" else f"{fruit_exp} {state_exp or '?'}"
        defect_cell = (f"{zones} (se esperaban)" if defect_exp else str(zones)) if zones or defect_exp else "-"
        filters = ", ".join(f"{k} {v}" for k, v in sorted(by_filter.items())) or "-"
        rows.append(
            f"| {kind[:-1]} | {path.name} | {expected} | {got} | {'sí' if fruit_ok else 'no'} | "
            f"{('sí' if state_ok else 'no') if kind == 'positivas' else '-'} | {defect_cell} | {filters} |"
        )

pct = lambda a, b: f"{100 * a / b:.0f} %" if b else "-"  # noqa: E731
lines = [
    "# Resultados de evaluate.py\n",
    f"- Modelo: `{MODEL_PATH.name}`",
    f"- Umbrales: {', '.join(f'{k} {v}' for k, v in CONF_BY_FRUIT.items())}",
    f"- CLIP: {'activado' if clip_verifier else 'desactivado'}\n",
    "| Tipo | Archivo | Esperado | Obtenido | Fruta | Estado | Zonas dañadas | Descartes por filtro |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    *rows,
    "",
    "## Resumen\n",
    f"- Fruta correcta en positivas: {stats['pos_fruit']}/{stats['pos']} ({pct(stats['pos_fruit'], stats['pos'])})",
    f"- Fruta y estado correctos en positivas: {stats['pos_state']}/{stats['pos']} ({pct(stats['pos_state'], stats['pos'])})",
    f"- Negativas rechazadas: {stats['neg_ok']}/{stats['neg']} ({pct(stats['neg_ok'], stats['neg'])})",
    f"- Fotos con manchas donde se marcaron zonas dañadas: {stats['defect_found']}/{stats['defect_exp']}",
    f"- Detecciones descartadas por filtro: {', '.join(f'{k} {v}' for k, v in sorted(discards.items())) or 'ninguna'}",
]
report = "\n".join(lines) + "\n"
Path(args.out).write_text(report, encoding="utf-8")
print(report)
