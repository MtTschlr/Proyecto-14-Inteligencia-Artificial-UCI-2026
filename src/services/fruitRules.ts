import type { FruitKey, FruitQualityState } from '../types';

// Clases del modelo best.pt (YOLOv8-seg): <fruta>_<estado> y "defecto".
export const DEFECT_CLASS = 'defecto';

export const FRUIT_NAMES: Record<FruitKey, string> = {
  banana: 'Banana',
  mango: 'Mango',
  naranja: 'Naranja',
  tomate: 'Tomate',
};

const STATE_FROM_SUFFIX: Record<string, FruitQualityState> = {
  verde: 'VERDE',
  madura: 'MADURO',
  maduro: 'MADURO',
  sobrepasada: 'SOBREPASADO',
  sobrepasado: 'SOBREPASADO',
};

export function parseModelClass(label: string): { fruit: FruitKey; state: FruitQualityState } | null {
  const [fruit, suffix] = label.split('_');
  if (!(fruit in FRUIT_NAMES) || !(suffix in STATE_FROM_SUFFIX)) return null;
  return { fruit: fruit as FruitKey, state: STATE_FROM_SUFFIX[suffix] };
}

const MASCULINE: FruitKey[] = ['mango', 'tomate'];

export function modelClassName(fruit: FruitKey, state: FruitQualityState): string {
  const masculine = MASCULINE.includes(fruit);
  const suffix = { VERDE: 'verde', MADURO: masculine ? 'maduro' : 'madura', SOBREPASADO: masculine ? 'sobrepasado' : 'sobrepasada' }[state];
  return `${fruit}_${suffix}`;
}

// El modelo no entrega calibre, peso ni vida útil: se resuelven con reglas fijas por fruta y estado.
interface FruitRule {
  caliber: string;
  weight: string;
  shelfLife: Record<FruitQualityState, string>;
}

export const FRUIT_RULES: Record<FruitKey, FruitRule> = {
  banana: {
    caliber: 'Calibre A (más de 20 cm)',
    weight: 'Caja estándar 18 kg',
    shelfLife: { VERDE: '7 a 10 días', MADURO: '2 a 4 días', SOBREPASADO: '1 día' },
  },
  mango: {
    caliber: 'Calibre mediano (350 a 450 g)',
    weight: 'Caja 10 kg',
    shelfLife: { VERDE: '5 a 8 días', MADURO: '3 a 5 días', SOBREPASADO: '1 día' },
  },
  naranja: {
    caliber: 'Calibre 72 (mediana)',
    weight: 'Caja 15 kg',
    shelfLife: { VERDE: '10 a 14 días', MADURO: '7 a 10 días', SOBREPASADO: '2 a 3 días' },
  },
  tomate: {
    caliber: 'Calibre M (60 a 70 mm)',
    weight: 'Cajón 18 kg',
    shelfLife: { VERDE: '8 a 12 días', MADURO: '4 a 6 días', SOBREPASADO: '1 a 2 días' },
  },
};

export function imperfectionLevel(percentage: number): 'Leve' | 'Moderada' | 'Elevada' {
  if (percentage < 5) return 'Leve';
  if (percentage < 12) return 'Moderada';
  return 'Elevada';
}

export function suggestAction(state: FruitQualityState, percentage: number): string {
  const level = imperfectionLevel(percentage);
  if (state === 'VERDE') {
    return level === 'Elevada'
      ? 'Separar y seleccionar antes de almacenar'
      : 'Almacenar en cámara y esperar la maduración';
  }
  if (state === 'MADURO') {
    if (level === 'Leve') return 'Despacho inmediato a locales comerciales';
    if (level === 'Moderada') return 'Venta rápida, priorizando la selección por calidad';
    return 'Venta con descuento o desvío a industria';
  }
  return level === 'Elevada'
    ? 'Descarte o entrega a industria procesadora'
    : 'Liquidar hoy para jugos o procesado';
}

export function describeImperfection(zones: number, percentage: number): string {
  if (zones === 0) return 'Sin zonas dañadas detectadas';
  const plural = zones === 1 ? 'zona dañada detectada' : 'zonas dañadas detectadas';
  return `${zones} ${plural} (${percentage.toFixed(1)} % de la superficie)`;
}
