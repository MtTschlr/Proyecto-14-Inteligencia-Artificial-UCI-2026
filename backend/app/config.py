import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRUITS = ("banana", "mango", "naranja", "tomate")


def _path(value: str | None) -> Path | None:
    if not value or value.strip().lower() in {"none", "0", "off"}:
        return None
    return Path(value)


@dataclass(frozen=True)
class Settings:
    model_path: Path = ROOT / "best.pt"
    model_version: str = "v4"
    fallback_path: Path | None = ROOT / "best_v2.pt"
    conf_threshold: float | None = None
    conf_overrides: dict[str, float] = field(default_factory=dict)
    defect_conf: float = 0.25
    min_area: float = 0.01
    min_cluster: float = 0.05
    max_fill: float = 0.93
    red_swap: float = 0.5
    max_side: int = 1600
    clip_verify: bool = True
    clip_swap: float = 0.6
    clip_margin: float = 0.25
    clip_max_crops: int = 6
    max_upload_mb: float = 10.0
    max_pixels: int = 40_000_000
    warmup: bool = True
    allowed_origins: tuple[str, ...] = ("*",)

    @classmethod
    def from_env(cls) -> "Settings":
        env = os.getenv
        threshold = env("CONF_THRESHOLD")
        return cls(
            model_path=Path(env("MODEL_PATH", str(ROOT / "best.pt"))),
            model_version=env("MODEL_VERSION", "v4"),
            fallback_path=_path(env("FALLBACK_MODEL_PATH", str(ROOT / "best_v2.pt"))),
            conf_threshold=float(threshold) if threshold else None,
            conf_overrides={f: float(env(f"CONF_{f.upper()}")) for f in FRUITS if env(f"CONF_{f.upper()}")},
            defect_conf=float(env("DEFECT_CONF", "0.25")),
            min_area=float(env("MIN_AREA", "0.01")),
            min_cluster=float(env("MIN_CLUSTER", "0.05")),
            max_fill=float(env("MAX_FILL", "0.93")),
            red_swap=float(env("RED_SWAP", "0.5")),
            max_side=int(env("MAX_SIDE", "1600")),
            clip_verify=env("CLIP_VERIFY", "1") == "1",
            clip_swap=float(env("CLIP_SWAP", "0.6")),
            clip_margin=float(env("CLIP_MARGIN", "0.25")),
            clip_max_crops=int(env("CLIP_MAX_CROPS", "6")),
            max_upload_mb=float(env("MAX_UPLOAD_MB", "10")),
            max_pixels=int(env("MAX_PIXELS", "40000000")),
            warmup=env("WARMUP", "1") == "1",
            allowed_origins=tuple(o.strip() for o in env("ALLOWED_ORIGINS", "*").split(",") if o.strip()),
        )

    def conf_by_fruit(self, clip_active: bool) -> dict[str, float]:
        # Con CLIP los falsos positivos se filtran después, así que el modelo puede ser menos exigente.
        base = self.conf_threshold if self.conf_threshold is not None else (0.25 if clip_active else 0.5)
        defaults = {"banana": base, "mango": base if clip_active else 0.6, "naranja": base, "tomate": base}
        return {f: self.conf_overrides.get(f, d) for f, d in defaults.items()}
