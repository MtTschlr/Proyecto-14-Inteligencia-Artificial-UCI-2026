DEFECT_CLASS = "defecto"
MASCULINE = {"mango", "tomate"}

STATE_FROM_SUFFIX = {
    "verde": "VERDE",
    "madura": "MADURO",
    "maduro": "MADURO",
    "sobrepasada": "SOBREPASADO",
    "sobrepasado": "SOBREPASADO",
}
TOMATE_FROM_NARANJA = {
    "naranja_verde": "tomate_verde",
    "naranja_madura": "tomate_maduro",
    "naranja_sobrepasada": "tomate_sobrepasado",
}


def split_class(label: str) -> tuple[str, str | None]:
    fruit, _, suffix = label.partition("_")
    return fruit, STATE_FROM_SUFFIX.get(suffix)


def class_name(fruit: str, state: str) -> str:
    suffix = {"VERDE": "verde", "MADURO": "madur", "SOBREPASADO": "sobrepasad"}[state]
    if state != "VERDE":
        suffix += "o" if fruit in MASCULINE else "a"
    return f"{fruit}_{suffix}"
