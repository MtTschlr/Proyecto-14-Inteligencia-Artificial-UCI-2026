import { useState } from 'react';
import type { Detection } from '../types';
import { prettyLabel, stateStyle } from '../lib/states';
import { Icon } from './Icon';

const STATE_OF: Record<string, string> = { verde: 'VERDE', madura: 'MADURO', maduro: 'MADURO', sobrepasada: 'SOBREPASADO', sobrepasado: 'SOBREPASADO' };
const shapesOf = (d: Detection): [number, number][][] => (d.polygons?.length ? d.polygons : d.polygon ? [d.polygon] : []);
const toPath = (polys: [number, number][][]) =>
  polys.map((p) => `M${p.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join('L')}Z`).join(' ');
const boxPath = ([x1, y1, x2, y2]: Detection['box']) => `M${x1 * 100},${y1 * 100}H${x2 * 100}V${y2 * 100}H${x1 * 100}Z`;
const colorOf = (label: string) => stateStyle(STATE_OF[label.split('_')[1]] ?? 'MADURO').color;

interface MaskViewerProps {
  src: string;
  detections: Detection[];
  badge?: string;
}

export function MaskViewer({ src, detections, badge }: MaskViewerProps) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [layers, setLayers] = useState({ frutas: true, danos: true, nombres: true });
  const [opacity, setOpacity] = useState(0.35);
  const fruits = detections.filter((d) => d.kind === 'fruta');
  const defects = detections.filter((d) => d.kind === 'defecto');
  const named = fruits.reduce<Detection[]>((acc, d) => {
    const far = acc.every((o) => Math.abs(o.box[0] - d.box[0]) > 0.28 || Math.abs(o.box[1] - d.box[1]) > 0.07);
    return far && acc.length < 4 ? [...acc, d] : acc;
  }, []);
  const toggle = (key: keyof typeof layers) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  const chip = (key: keyof typeof layers, label: string, icon: string, count?: number) => (
    <button
      onClick={() => toggle(key)}
      aria-pressed={layers[key]}
      className={`h-10 pl-3 pr-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors ${
        layers[key] ? 'bg-hoja text-anil-950' : 'bg-anil-800 text-anil-300 hover:bg-anil-700'
      }`}
    >
      <Icon name={layers[key] ? icon : 'eye-crossed'} size={14} />
      {label}
      {count !== undefined && <span className="font-mono opacity-60">{count}</span>}
    </button>
  );

  return (
    <div className="rounded-[28px] overflow-hidden bg-anil-950">
      <div className="relative flex items-center justify-center min-h-56">
        <div
          className="relative"
          style={ratio ? { aspectRatio: ratio, width: `min(100%, calc(min(64dvh, 620px) * ${ratio}))` } : { width: '100%' }}
        >
          <img
            src={src}
            alt="Foto analizada con las zonas detectadas"
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
              if (w && h) setRatio(w / h);
            }}
            className="block w-full h-auto"
          />
          {ratio && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              {layers.frutas &&
                fruits.map((d, i) => {
                  const shapes = shapesOf(d);
                  const color = colorOf(d.label);
                  return (
                    <path
                      key={`f${i}`}
                      d={shapes.length ? toPath(shapes) : boxPath(d.box)}
                      fill={shapes.length ? color : 'none'}
                      fillOpacity={opacity}
                      fillRule="evenodd"
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              {layers.danos &&
                defects.map((d, i) => {
                  const shapes = shapesOf(d);
                  return (
                    <path
                      key={`d${i}`}
                      d={shapes.length ? toPath(shapes) : boxPath(d.box)}
                      fill="var(--color-frambuesa-500)"
                      fillOpacity={Math.min(0.9, opacity + 0.3)}
                      stroke="#fff"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
            </svg>
          )}
          {ratio && layers.nombres && layers.frutas &&
            named.map((d, i) => (
              <span
                key={`l${i}`}
                className={`absolute rounded-lg bg-anil-950/85 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-hoja pointer-events-none whitespace-nowrap ${
                  d.box[1] > 0.1 ? '-translate-y-full -mt-1' : 'mt-1'
                }`}
                style={{ left: `${Math.min(Math.max(d.box[0], 0.01), 0.62) * 100}%`, top: `${Math.max(d.box[1], 0) * 100}%` }}
              >
                {prettyLabel(d.label)} {Math.round(d.confidence * 100)}%
              </span>
            ))}
        </div>
      </div>

      {badge && <p className="px-4 py-2 bg-sol-500 text-anil-950 text-xs font-bold">{badge}</p>}
      {detections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-3 bg-anil-900">
          {chip('frutas', 'Frutas', 'eye', fruits.length)}
          {chip('danos', 'Daños', 'eye', defects.length)}
          {chip('nombres', 'Nombres', 'label')}
          <label className="ml-auto flex items-center gap-2 text-xs text-anil-300 font-semibold">
            <span>Relleno</span>
            <input
              type="range"
              min={0}
              max={0.7}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-24 accent-lima-400"
              aria-label="Opacidad de las máscaras"
            />
          </label>
        </div>
      )}
    </div>
  );
}
