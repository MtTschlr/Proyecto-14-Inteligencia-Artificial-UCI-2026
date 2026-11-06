import type { FruitQualityState } from '../types';

export const STATE_ORDER: FruitQualityState[] = ['VERDE', 'MADURO', 'SOBREPASADO'];

export interface StateStyle {
  label: string;
  hint: string;
  icon: string;
  chip: string;
  fill: string;
  color: string;
}

export const STATE_STYLE: Record<FruitQualityState, StateStyle> = {
  VERDE: {
    label: 'Verde',
    hint: 'Le falta madurar',
    icon: 'seedling',
    chip: 'bg-verde-100 text-verde-900',
    fill: 'bg-verde-500',
    color: 'var(--color-verde-500)',
  },
  MADURO: {
    label: 'Maduro',
    hint: 'Punto justo de venta',
    icon: 'sun',
    chip: 'bg-sol-100 text-sol-900',
    fill: 'bg-sol-500',
    color: 'var(--color-sol-500)',
  },
  SOBREPASADO: {
    label: 'Sobrepasado',
    hint: 'Pasado de punto',
    icon: 'hourglass-end',
    chip: 'bg-ciruela-100 text-ciruela-900',
    fill: 'bg-ciruela-500',
    color: 'var(--color-ciruela-500)',
  },
};

export const stateStyle = (state: string): StateStyle => STATE_STYLE[state as FruitQualityState] ?? STATE_STYLE.MADURO;

export function imperfectionLevel(percentage: number): 'Leve' | 'Moderada' | 'Elevada' {
  if (percentage < 5) return 'Leve';
  if (percentage < 12) return 'Moderada';
  return 'Elevada';
}

export function parseShelfLife(text: string): { min: number; max: number } {
  const match = text.match(/(\d+)(?:\s*(?:a|-|–)\s*(\d+))?/);
  if (!match) return { min: 0, max: 0 };
  const min = Number(match[1]);
  return { min, max: match[2] ? Number(match[2]) : min };
}

const FRUIT_ICON: Record<string, string> = { banana: 'banana', mango: 'mango', naranja: 'citrus', tomate: 'tomato' };
export const fruitIcon = (fruit: string) => FRUIT_ICON[fruit.toLowerCase()] ?? 'apple-whole';

export function prettyLabel(label: string): string {
  if (label === 'defecto') return 'zona dañada';
  const [fruit, state] = label.split('_');
  return `${fruit} ${state ?? ''}`.trim();
}

export const REASON_TEXT: Record<string, string> = {
  confianza: 'Poca confianza',
  area: 'Muy chica en la foto',
  forma: 'Forma rectangular',
  clip: 'CLIP vio otra cosa',
};
