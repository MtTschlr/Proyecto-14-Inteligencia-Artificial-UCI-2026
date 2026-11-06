import argparse
import os
import statistics
import time
from collections import Counter
from dataclasses import replace
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import ROOT, Settings  # noqa: E402
from app.engine import Engine  # noqa: E402
from app.labels import STATE_FROM_SUFFIX  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import load_clip, load_detector, load_fallback  # noqa: E402

BASE = Path(__file__).resolve().parent / "tests" / "imagenes"
FRUITS = ["banana", "mango", "naranja", "tomate"]
STATES = ["VERDE", "MADURO", "SOBREPASADO"]
NONE = "sin fruta"
HATCHES = ["", "///", "...", "xx"]
GRAYS = ["#1a1a1a", "#7a7a7a", "#bdbdbd", "#ffffff"]

parser = argparse.ArgumentParser(description="Pasa las fotos de tests/imagenes por /predict y calcula métricas.")
parser.add_argument("model", nargs="?", help="Modelo a probar (por defecto ../best.pt)")
parser.add_argument("--conf", action="append", default=[], help="Umbral general (0.45) o por fruta (mango=0.7). Se puede repetir.")
parser.add_argument("--no-clip", action="store_true", help="Evalúa solo sin CLIP")
parser.add_argument("--sin-variantes", action="store_true", help="Corre solo la configuración principal")
parser.add_argument("--out", default=str(ROOT / "docs" / "evaluacion.md"))
parser.add_argument("--figuras", default=str(ROOT / "docs" / "figuras"))
args = parser.parse_args()


def build_settings() -> Settings:
    settings = Settings.from_env()
    if args.model:
        settings = replace(settings, model_path=Path(args.model))
    overrides = dict(settings.conf_overrides)
    threshold = settings.conf_threshold
    for value in args.conf:
        fruit, _, conf = value.rpartition("=")
        if fruit:
            overrides[fruit] = float(conf)
        else:
            threshold = float(conf)
    return replace(settings, conf_threshold=threshold, conf_overrides=overrides, clip_verify=not args.no_clip, warmup=False)


def expected_from(path: Path, kind: str):
    if kind == "negativas":
        return NONE, None, False
    parts = path.stem.split("_")
    return parts[0], STATE_FROM_SUFFIX.get(parts[1]) if len(parts) > 1 else None, "manchas" in parts


def photos():
    for kind in ("positivas", "negativas"):
        for path in sorted(p for p in (BASE / kind).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}):
            yield kind, path


def run_variant(engine: Engine) -> list[dict]:
    rows = []
    with TestClient(create_app(engine.settings, engine=engine)) as client:
        for kind, path in photos():
            data = path.read_bytes()
            started = time.perf_counter()
            res = client.post("/predict", files={"file": (path.name, data, "image/jpeg")})
            latency = (time.perf_counter() - started) * 1000
            if res.status_code not in (200, 422):
                res.raise_for_status()
            body = res.json()
            fruit_exp, state_exp, defect_exp = expected_from(path, kind)
            ok = res.status_code == 200
            rows.append({
                "kind": kind,
                "name": path.name,
                "fruit_exp": fruit_exp,
                "state_exp": state_exp,
                "defect_exp": defect_exp,
                "fruit": body["fruit_type"].lower() if ok else NONE,
                "state": body["state"] if ok else None,
                "conf": body.get("confidence"),
                "zones": sum(d["kind"] == "defecto" for d in body["detections"]) if ok else 0,
                "model": body["verification"].get("model") if ok else None,
                "filters": body["verification"]["discarded_by"],
                "reason": body.get("reason"),
                "latency": latency,
                "server_ms": body["elapsed_ms"],
            })
    return rows


def prf(rows, key_exp, key_pred, label):
    tp = sum(r[key_exp] == label and r[key_pred] == label for r in rows)
    fp = sum(r[key_exp] != label and r[key_pred] == label for r in rows)
    fn = sum(r[key_exp] == label and r[key_pred] != label for r in rows)
    p = tp / (tp + fp) if tp + fp else 0.0
    rc = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * p * rc / (p + rc) if p + rc else 0.0
    return {"label": label, "tp": tp, "fp": fp, "fn": fn, "precision": p, "recall": rc, "f1": f1, "support": tp + fn}


def percentile(values, q):
    ordered = sorted(values)
    k = (len(ordered) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (k - lo)


def summarize(rows):
    pos = [r for r in rows if r["kind"] == "positivas"]
    neg = [r for r in rows if r["kind"] == "negativas"]
    for r in pos:
        r["fruit_ok"] = r["fruit"] == r["fruit_exp"]
        r["state_ok"] = r["fruit_ok"] and (r["state_exp"] is None or r["state"] == r["state_exp"])
    for r in neg:
        r["fruit_ok"] = r["fruit"] == NONE
        r["state_ok"] = None
    lat = [r["latency"] for r in rows]
    return {
        "pos": len(pos),
        "neg": len(neg),
        "pos_fruit": sum(r["fruit_ok"] for r in pos),
        "pos_state": sum(r["state_ok"] for r in pos),
        "neg_ok": sum(r["fruit_ok"] for r in neg),
        "fpr": sum(not r["fruit_ok"] for r in neg) / len(neg),
        "defect_exp": sum(r["defect_exp"] for r in pos),
        "defect_found": sum(r["defect_exp"] and r["zones"] > 0 for r in pos),
        "fruit_metrics": [prf(rows, "fruit_exp", "fruit", f) for f in FRUITS],
        "state_metrics": [prf(pos, "state_exp", "state", s) for s in STATES],
        "lat_mean": statistics.mean(lat),
        "lat_p50": percentile(lat, 0.5),
        "lat_p95": percentile(lat, 0.95),
        "lat_max": max(lat),
        "server_mean": statistics.mean(r["server_ms"] for r in rows),
        "discards": sum((Counter(r["filters"]) for r in rows), Counter()),
    }


def confusion(rows, labels_true, labels_pred, key_exp, key_pred):
    return [[sum(r[key_exp] == t and (r[key_pred] or NONE) == p for r in rows) for p in labels_pred] for t in labels_true]


def pct(a, b):
    return f"{100 * a / b:.0f} %" if b else "-"


def md_table(header, rows):
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join("---" for _ in header) + " |"]
    lines += ["| " + " | ".join(str(c) for c in row) + " |" for row in rows]
    return lines


def style_axes(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.spines["left"].set_color("#555")
    ax.spines["bottom"].set_color("#555")
    ax.tick_params(colors="#222", labelsize=10)
    ax.grid(axis="y", color="#ddd", linewidth=0.8)
    ax.set_axisbelow(True)


def plot_confusion(matrix, labels_true, labels_pred, title, xlabel, ylabel, path):
    fig, ax = plt.subplots(figsize=(6.4, 5.4), dpi=150)
    shares = [[v / (sum(row) or 1) for v in row] for row in matrix]
    ax.imshow(shares, cmap="Greys", vmin=0, vmax=1.15)
    for i, row in enumerate(matrix):
        for j, v in enumerate(row):
            ax.text(j, i, str(v), ha="center", va="center", fontsize=13, fontweight="bold" if i == j else "normal",
                    color="white" if shares[i][j] > 0.55 else "black")
    fig.text(0.01, 0.01, "Número: cantidad de fotos. Tono: parte de la fila.", fontsize=8, color="#444")
    ax.set_xticks(range(len(labels_pred)), labels_pred, rotation=20, ha="right")
    ax.set_yticks(range(len(labels_true)), labels_true)
    ax.set_xlabel(xlabel, fontsize=11)
    ax.set_ylabel(ylabel, fontsize=11)
    ax.set_title(title, fontsize=12, loc="left")
    ax.set_xticks([x - 0.5 for x in range(1, len(labels_pred))], minor=True)
    ax.set_yticks([y - 0.5 for y in range(1, len(labels_true))], minor=True)
    ax.grid(which="minor", color="white", linewidth=2)
    ax.tick_params(which="minor", length=0)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def grouped_bars(groups, series, values, title, ylabel, path, as_pct=False):
    fig, ax = plt.subplots(figsize=(8.4, 4.6), dpi=150)
    n = len(series)
    width = 0.8 / n
    ymax = 100 if as_pct else 1.0
    for k, name in enumerate(series):
        xs = [i - 0.4 + width * (k + 0.5) for i in range(len(groups))]
        vals = [values[g][k] * ymax for g in range(len(groups))]
        bars = ax.bar(xs, vals, width * 0.92, label=name, color=GRAYS[k], edgecolor="#1a1a1a", linewidth=0.8, hatch=HATCHES[k])
        for b, v in zip(bars, vals):
            text = f"{v:.0f} %" if as_pct else f"{v:.2f}"
            ax.text(b.get_x() + b.get_width() / 2, b.get_height() + ymax * 0.015, text, ha="center", va="bottom", fontsize=8)
    ax.set_xticks(range(len(groups)), groups)
    ax.set_ylim(0, ymax * 1.12)
    ax.set_ylabel(ylabel, fontsize=11)
    ax.set_title(title, fontsize=12, loc="left")
    style_axes(ax)
    ax.legend(frameon=False, ncol=n, loc="upper left", bbox_to_anchor=(0, -0.12), fontsize=9)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def plot_latency(results, path):
    fig, ax = plt.subplots(figsize=(8.4, 4.4), dpi=150)
    names = list(results)
    data = [[r["latency"] for r in results[n]["rows"]] for n in names]
    ax.boxplot(data, vert=False, widths=0.5, patch_artist=True,
               boxprops={"facecolor": "#d9d9d9", "edgecolor": "#1a1a1a"}, medianprops={"color": "#1a1a1a", "linewidth": 2},
               whiskerprops={"color": "#1a1a1a"}, capprops={"color": "#1a1a1a"},
               flierprops={"marker": "o", "markerfacecolor": "white", "markeredgecolor": "#1a1a1a", "markersize": 5})
    ax.set_yticks(range(1, len(names) + 1), names)
    for i, n in enumerate(names, start=1):
        s = results[n]["summary"]
        ax.plot(s["lat_mean"], i, marker="D", color="black", markersize=6)
        ax.plot(s["lat_p95"], i, marker="|", color="black", markersize=16, markeredgewidth=2)
        ax.text(s["lat_p95"], i + 0.32, f"media {s['lat_mean']:.0f} · p95 {s['lat_p95']:.0f}", fontsize=8, ha="center")
    ax.set_xlabel("Milisegundos por foto (de punta a punta)", fontsize=11)
    ax.set_title("Latencia por variante (rombo: media, raya: p95)", fontsize=12, loc="left")
    ax.set_xlim(left=0)
    style_axes(ax)
    ax.grid(axis="x", color="#ddd", linewidth=0.8)
    ax.grid(axis="y", visible=False)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def main():
    settings = build_settings()
    model = load_detector(settings.model_path)
    fallback = load_fallback(settings)
    clip, clip_error = load_clip(settings)
    if settings.clip_verify and clip is None:
        print(f"CLIP no cargó ({clip_error}); se evalúa sin CLIP")

    variants = {}
    clip_options = [True, False] if clip is not None and not args.sin_variantes else [clip is not None]
    fb_options = [True, False] if fallback is not None and not args.sin_variantes else [fallback is not None]
    for use_clip in clip_options:
        for use_fb in fb_options:
            name = f"{'CLIP' if use_clip else 'Sin CLIP'} {'+ respaldo' if use_fb else 'sin respaldo'}"
            variants[name] = Engine(settings, model, fallback if use_fb else None, clip if use_clip else None, clip_error)

    first = next(iter(variants.values()))
    first.warmup()
    results = {}
    for name, engine in variants.items():
        print(f"Evaluando: {name}")
        rows = run_variant(engine)
        results[name] = {"rows": rows, "summary": summarize(rows), "engine": engine}

    main_name = next(iter(results))
    main_res = results[main_name]
    rows, s, engine = main_res["rows"], main_res["summary"], main_res["engine"]
    fig_dir = Path(args.figuras)
    fig_dir.mkdir(parents=True, exist_ok=True)
    out = Path(args.out)
    figs = os.path.relpath(fig_dir, out.parent).replace("\\", "/")

    fruit_labels = FRUITS + [NONE]
    cm_fruit = confusion(rows, fruit_labels, fruit_labels, "fruit_exp", "fruit")
    pos = [r for r in rows if r["kind"] == "positivas"]
    cm_state = confusion(pos, STATES, STATES + [NONE], "state_exp", "state")
    plot_confusion(cm_fruit, fruit_labels, fruit_labels, f"Matriz de confusión por fruta ({main_name})",
                   "Fruta que respondió el sistema", "Fruta real", fig_dir / "confusion_frutas.png")
    plot_confusion(cm_state, STATES, STATES + [NONE], f"Matriz de confusión por estado ({main_name})",
                   "Estado que respondió el sistema", "Estado real", fig_dir / "confusion_estados.png")
    metric_rows = s["fruit_metrics"] + s["state_metrics"]
    grouped_bars([m["label"].capitalize() if m["label"] in FRUITS else m["label"].lower() for m in metric_rows],
                 ["Precisión", "Recall", "F1"],
                 [[m["precision"], m["recall"], m["f1"]] for m in metric_rows],
                 f"Precisión, recall y F1 por fruta y por estado ({main_name})", "Valor (0 a 1)", fig_dir / "f1_por_clase.png")
    names = list(results)
    grouped_bars(names, ["Fruta correcta", "Fruta y estado", "Fotos sin fruta rechazadas"],
                 [[results[n]["summary"]["pos_fruit"] / s["pos"], results[n]["summary"]["pos_state"] / s["pos"],
                   results[n]["summary"]["neg_ok"] / s["neg"]] for n in names],
                 "Comparación de variantes", "Porcentaje de fotos (%)", fig_dir / "variantes.png", as_pct=True)
    plot_latency(results, fig_dir / "latencia.png")

    def fmt(v):
        return f"{v:.2f}"

    lines = [
        "# Evaluación del modelo\n",
        f"Generado por `backend/evaluate.py` el {time.strftime('%d/%m/%Y %H:%M')}. "
        f"{s['pos']} fotos con fruta y {s['neg']} sin fruta de `backend/tests/imagenes`, pasadas por el mismo `/predict` que usa la app.\n",
        f"- Modelo principal: `{engine.model_name}`" + (f", respaldo `{fallback and settings.fallback_path.name}`" if fallback else ""),
        f"- Umbrales con CLIP: {', '.join(f'{k} {v}' for k, v in settings.conf_by_fruit(True).items())}",
        f"- Umbrales sin CLIP: {', '.join(f'{k} {v}' for k, v in settings.conf_by_fruit(False).items())}",
        f"- CLIP: {'disponible' if clip else f'no disponible ({clip_error})'}\n",
        "## Resumen por variante\n",
        *md_table(
            ["Variante", "Fruta correcta", "Fruta y estado", "Sin fruta rechazadas", "Falsos positivos", "Zonas dañadas", "Latencia media", "Latencia p95"],
            [[n, f"{r['summary']['pos_fruit']}/{s['pos']}", f"{r['summary']['pos_state']}/{s['pos']}",
              f"{r['summary']['neg_ok']}/{s['neg']}", pct(r['summary']['fpr'] * s['neg'], s['neg']),
              f"{r['summary']['defect_found']}/{r['summary']['defect_exp']}",
              f"{r['summary']['lat_mean']:.0f} ms", f"{r['summary']['lat_p95']:.0f} ms"] for n, r in results.items()],
        ),
        "",
        f"![Comparación de variantes]({figs}/variantes.png)\n",
        f"## Métricas de la variante principal ({main_name})\n",
        "### Por fruta\n",
        "Se cuentan las 69 fotos. Una foto sin fruta donde el sistema dice \"naranja\" es un falso positivo de naranja.\n",
        *md_table(["Fruta", "Precisión", "Recall", "F1", "VP", "FP", "FN"],
                  [[m["label"], fmt(m["precision"]), fmt(m["recall"]), fmt(m["f1"]), m["tp"], m["fp"], m["fn"]] for m in s["fruit_metrics"]]),
        "",
        f"F1 promedio (macro) de las cuatro frutas: {statistics.mean(m['f1'] for m in s['fruit_metrics']):.2f}\n",
        "### Por estado\n",
        "Solo fotos con fruta. Se compara el estado aunque la fruta haya salido mal.\n",
        *md_table(["Estado", "Precisión", "Recall", "F1", "VP", "FP", "FN"],
                  [[m["label"], fmt(m["precision"]), fmt(m["recall"]), fmt(m["f1"]), m["tp"], m["fp"], m["fn"]] for m in s["state_metrics"]]),
        "",
        f"![F1 por clase]({figs}/f1_por_clase.png)\n",
        "### Matriz de confusión por fruta\n",
        "Filas: fruta real. Columnas: lo que respondió el sistema.\n",
        *md_table(["Real \\ Respuesta", *fruit_labels], [[t, *row] for t, row in zip(fruit_labels, cm_fruit)]),
        "",
        f"![Matriz de confusión por fruta]({figs}/confusion_frutas.png)\n",
        "### Matriz de confusión por estado\n",
        *md_table(["Real \\ Respuesta", *STATES, NONE], [[t, *row] for t, row in zip(STATES, cm_state)]),
        "",
        f"![Matriz de confusión por estado]({figs}/confusion_estados.png)\n",
        "### Fotos sin fruta y latencia\n",
        f"- Tasa de falsos positivos en fotos sin fruta: {s['fpr'] * 100:.1f} % ({s['neg'] - s['neg_ok']} de {s['neg']})",
        f"- Latencia de punta a punta por foto: media {s['lat_mean']:.0f} ms, mediana {s['lat_p50']:.0f} ms, p95 {s['lat_p95']:.0f} ms, máxima {s['lat_max']:.0f} ms",
        f"- Tiempo medio medido dentro del servidor (`elapsed_ms`): {s['server_mean']:.0f} ms",
        f"- Detecciones descartadas por filtro: {', '.join(f'{k} {v}' for k, v in sorted(s['discards'].items())) or 'ninguna'}\n",
        f"![Latencia]({figs}/latencia.png)\n",
        f"## Detalle por foto ({main_name})\n",
        *md_table(
            ["Tipo", "Archivo", "Esperado", "Obtenido", "Fruta", "Estado", "Zonas dañadas", "Modelo", "Descartes", "ms"],
            [[r["kind"][:-1], r["name"],
              NONE if r["kind"] == "negativas" else f"{r['fruit_exp']} {r['state_exp'] or '?'}",
              f"{r['fruit']} {r['state']} ({r['conf']:.2f})" if r["state"] else f"sin fruta ({r['reason']})",
              "sí" if r["fruit_ok"] else "no",
              ("sí" if r["state_ok"] else "no") if r["kind"] == "positivas" else "-",
              (f"{r['zones']} (se esperaban)" if r["defect_exp"] else str(r["zones"])) if r["zones"] or r["defect_exp"] else "-",
              r["model"] or "-",
              ", ".join(f"{k} {v}" for k, v in sorted(r["filters"].items())) or "-",
              f"{r['latency']:.0f}"] for r in rows],
        ),
    ]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print()
    for n, r in results.items():
        x = r["summary"]
        print(f"{n:24s} fruta {x['pos_fruit']}/{x['pos']}  fruta+estado {x['pos_state']}/{x['pos']}  "
              f"negativas {x['neg_ok']}/{x['neg']}  zonas {x['defect_found']}/{x['defect_exp']}  "
              f"latencia media {x['lat_mean']:.0f} ms  p95 {x['lat_p95']:.0f} ms")
    print(f"\nReporte: {out}\nFiguras: {fig_dir}")


if __name__ == "__main__":
    main()
