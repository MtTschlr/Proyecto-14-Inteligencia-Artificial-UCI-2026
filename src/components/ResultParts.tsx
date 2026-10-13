import React from 'react';
import type { FruitQualityState } from '../types';
import { STATE_ORDER, STATE_STYLE, getStateStyle, parseShelfLife } from '../lib/stateStyle';
import { imperfectionLevel } from '../services/fruitRules';
import { useCountUp, useEntered } from '../lib/motion';

export const ConfidenceRing: React.FC<{ value: number }> = ({ value }) => {
  const entered = useEntered();
  const shown = useCountUp(value * 100, 800);
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (entered ? value : 0));

  return (
    <div className="relative w-18 h-18 shrink-0" role="img" aria-label={`Confianza de la IA: ${Math.round(value * 100)} por ciento`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--color-papel-hondo)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--color-hoja-700)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono text-lg font-semibold text-hoja-900">{Math.round(shown)}%</span>
        <span className="text-[10px] text-tinta-tenue mt-0.5">IA</span>
      </div>
    </div>
  );
};

export const MaturityScale: React.FC<{ state: FruitQualityState }> = ({ state }) => {
  const entered = useEntered();
  const index = Math.max(0, STATE_ORDER.indexOf(state));
  const target = ((index + 0.5) / STATE_ORDER.length) * 100;
  const style = getStateStyle(state);
  const { Icon } = style;

  return (
    <div>
      <div className="relative h-9 mb-1">
        <div
          className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center transition-[left] duration-700 ease-out"
          style={{ left: `${entered ? target : 0}%` }}
        >
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${style.solid}`}>
            <Icon size={14} />
            {style.label}
          </span>
          <span className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[7px]" style={{ borderTopColor: style.color }} />
        </div>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {STATE_ORDER.map((s) => (
          <span key={s} className={`flex-1 ${STATE_STYLE[s].dot} ${s === state ? '' : 'opacity-35'} transition-opacity duration-500`} />
        ))}
      </div>

      <div className="grid grid-cols-3 mt-2.5 text-center">
        {STATE_ORDER.map((s) => {
          const info = STATE_STYLE[s];
          const active = s === state;
          return (
            <div key={s} className={active ? 'text-tinta' : 'text-tinta-tenue'}>
              <span className={`block text-xs ${active ? 'font-bold' : 'font-medium'}`}>{info.label}</span>
              <span className="block text-[11px] leading-tight">{info.hint}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LEVEL_STYLE = {
  Leve: { chip: 'bg-lima-100 text-lima-900 border-lima-300', bar: 'var(--color-lima-500)' },
  Moderada: { chip: 'bg-miel-100 text-miel-900 border-miel-300', bar: 'var(--color-miel-500)' },
  Elevada: { chip: 'bg-terracota-100 text-terracota-900 border-terracota-300', bar: 'var(--color-terracota-500)' },
} as const;

export const ImperfectionMeter: React.FC<{ percentage: number; details: string }> = ({ percentage, details }) => {
  const entered = useEntered();
  const shown = useCountUp(percentage, 800);
  const level = imperfectionLevel(percentage);
  const style = LEVEL_STYLE[level];
  const width = Math.min(100, (percentage / 20) * 100);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-2.5">
        <div className="font-mono text-4xl font-semibold text-tinta leading-none">
          {shown.toFixed(1)}
          <span className="text-xl text-tinta-suave ml-0.5">%</span>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style.chip}`}>{level}</span>
      </div>
      <div className="relative h-3 rounded-full bg-papel-hondo overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${entered ? Math.max(width, 2) : 0}%`, backgroundColor: style.bar }}
        />
        <span aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-papel-claro" style={{ left: '25%' }} />
        <span aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-papel-claro" style={{ left: '60%' }} />
      </div>
      <div className="relative h-4 mt-1 font-mono text-[10px] text-tinta-tenue">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: '25%' }}>5</span>
        <span className="absolute -translate-x-1/2" style={{ left: '60%' }}>12</span>
        <span className="absolute right-0">20+</span>
      </div>
      <p className="text-sm text-tinta-suave mt-1.5">{details}</p>
    </div>
  );
};

export const ShelfTimeline: React.FC<{ text: string; state: FruitQualityState }> = ({ text, state }) => {
  const entered = useEntered();
  const { min, max } = parseShelfLife(text);
  const style = getStateStyle(state);
  const cells = Math.min(Math.max(max + 2, 7), 21);

  return (
    <div>
      <div className="font-mono text-2xl font-semibold text-tinta mb-3">{text}</div>
      <div className="flex gap-1" role="img" aria-label={`Vida útil estimada: ${text}`}>
        {Array.from({ length: cells }, (_, i) => {
          const day = i + 1;
          const solid = day <= min;
          const range = !solid && day <= max;
          return (
            <span
              key={day}
              className="h-7 flex-1 rounded-[5px] border transition-all duration-300"
              style={{
                transitionDelay: `${i * 25}ms`,
                opacity: entered ? 1 : 0,
                backgroundColor: solid ? style.color : range ? 'transparent' : 'var(--color-papel-hondo)',
                borderColor: solid || range ? style.color : 'var(--color-linea-suave)',
                borderStyle: range ? 'dashed' : 'solid',
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 font-mono text-[10px] text-tinta-tenue">
        <span>Hoy</span>
        <span>Día {cells}</span>
      </div>
    </div>
  );
};

export const SpecRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3">
    <span className="mt-0.5 w-9 h-9 rounded-lg bg-salvia-100 text-hoja-700 flex items-center justify-center shrink-0">{icon}</span>
    <div className="min-w-0">
      <dt className="text-xs text-tinta-tenue">{label}</dt>
      <dd className="text-sm font-semibold text-tinta leading-snug">{value}</dd>
    </div>
  </div>
);
