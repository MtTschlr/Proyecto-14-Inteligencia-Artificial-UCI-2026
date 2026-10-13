import type { FruitQualityState } from '../types';
import { BadgeCheckIcon, HourglassIcon, SeedlingIcon } from '../components/CustomIcons';

export const STATE_ORDER: FruitQualityState[] = ['VERDE', 'MADURO', 'SOBREPASADO'];

export interface StateStyle {
  label: string;
  hint: string;
  Icon: typeof SeedlingIcon;
  soft: string;
  solid: string;
  dot: string;
  accentText: string;
  color: string;
  colorDark: string;
}

export const STATE_STYLE: Record<FruitQualityState, StateStyle> = {
  VERDE: {
    label: 'Verde',
    hint: 'Inmaduro',
    Icon: SeedlingIcon,
    soft: 'bg-lima-100 text-lima-900',
    solid: 'bg-lima-500 text-lima-900',
    dot: 'bg-lima-500',
    accentText: 'text-lima-700',
    color: 'var(--color-lima-500)',
    colorDark: 'var(--color-lima-700)',
  },
  MADURO: {
    label: 'Maduro',
    hint: 'Punto óptimo',
    Icon: BadgeCheckIcon,
    soft: 'bg-miel-100 text-miel-900',
    solid: 'bg-miel-500 text-miel-900',
    dot: 'bg-miel-500',
    accentText: 'text-miel-700',
    color: 'var(--color-miel-500)',
    colorDark: 'var(--color-miel-700)',
  },
  SOBREPASADO: {
    label: 'Sobrepasado',
    hint: 'Pasado de punto',
    Icon: HourglassIcon,
    soft: 'bg-terracota-100 text-terracota-900',
    solid: 'bg-terracota-500 text-white',
    dot: 'bg-terracota-500',
    accentText: 'text-terracota-700',
    color: 'var(--color-terracota-500)',
    colorDark: 'var(--color-terracota-700)',
  },
};

export function getStateStyle(state: string): StateStyle {
  return STATE_STYLE[state as FruitQualityState] ?? STATE_STYLE.MADURO;
}

export function parseShelfLife(text: string): { min: number; max: number } {
  const match = text.match(/(\d+)(?:\s*(?:a|-|–)\s*(\d+))?/);
  if (!match) return { min: 0, max: 0 };
  const min = Number(match[1]);
  return { min, max: match[2] ? Number(match[2]) : min };
}
