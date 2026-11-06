# El modelo solo entrega la clase (fruta_estado), las máscaras y la confianza.
# Calibre, peso y vida útil salen de estas reglas fijas por fruta y estado.
FRUIT_RULES = {
    "banana": {
        "name": "Banana",
        "caliber": "Calibre A (más de 20 cm)",
        "weight": "Caja estándar 18 kg",
        "shelf_life": {"VERDE": "7 a 10 días", "MADURO": "2 a 4 días", "SOBREPASADO": "1 día"},
    },
    "mango": {
        "name": "Mango",
        "caliber": "Calibre mediano (350 a 450 g)",
        "weight": "Caja 10 kg",
        "shelf_life": {"VERDE": "5 a 8 días", "MADURO": "3 a 5 días", "SOBREPASADO": "1 día"},
    },
    "naranja": {
        "name": "Naranja",
        "caliber": "Calibre 72 (mediana)",
        "weight": "Caja 15 kg",
        "shelf_life": {"VERDE": "10 a 14 días", "MADURO": "7 a 10 días", "SOBREPASADO": "2 a 3 días"},
    },
    "tomate": {
        "name": "Tomate",
        "caliber": "Calibre M (60 a 70 mm)",
        "weight": "Cajón 18 kg",
        "shelf_life": {"VERDE": "8 a 12 días", "MADURO": "4 a 6 días", "SOBREPASADO": "1 a 2 días"},
    },
}


def imperfection_level(percentage: float) -> str:
    if percentage < 5:
        return "Leve"
    if percentage < 12:
        return "Moderada"
    return "Elevada"


def suggest_action(state: str, percentage: float) -> str:
    level = imperfection_level(percentage)
    if state == "VERDE":
        if level == "Elevada":
            return "Separar y seleccionar antes de almacenar"
        return "Almacenar en cámara y esperar la maduración"
    if state == "MADURO":
        if level == "Leve":
            return "Despacho inmediato a locales comerciales"
        if level == "Moderada":
            return "Venta rápida, priorizando la selección por calidad"
        return "Venta con descuento o desvío a industria"
    if level == "Elevada":
        return "Descarte o entrega a industria procesadora"
    return "Liquidar hoy para jugos o procesado"


def describe_imperfection(zones: int, percentage: float) -> str:
    if zones == 0:
        return "Sin zonas dañadas detectadas"
    noun = "zona dañada detectada" if zones == 1 else "zonas dañadas detectadas"
    return f"{zones} {noun} ({percentage:.1f} % de la superficie)"
