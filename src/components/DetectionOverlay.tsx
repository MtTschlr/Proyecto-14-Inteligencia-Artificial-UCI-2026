import React, { useState } from 'react';
import type { Detection } from '../types';

interface DetectionOverlayProps {
  src: string;
  alt: string;
  detections: Detection[];
  color: string;
  visible: boolean;
  maxHeight?: string;
}

// El historial viejo solo trae `polygon`; el backend nuevo manda `polygons` (una entrada por parte de la máscara).
const shapesOf = (d: Detection): [number, number][][] => d.polygons?.length ? d.polygons : d.polygon ? [d.polygon] : [];

const toPath = (polygons: [number, number][][]) =>
  polygons
    .map((poly) => `M${poly.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join('L')}Z`)
    .join(' ');

const boxPath = ([x1, y1, x2, y2]: Detection['box']) =>
  `M${x1 * 100},${y1 * 100}H${x2 * 100}V${y2 * 100}H${x1 * 100}Z`;

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  src,
  alt,
  detections,
  color,
  visible,
  maxHeight = 'clamp(220px, 58dvh, 560px)',
}) => {
  const [ratio, setRatio] = useState<number | null>(null);
  const fruits = detections.filter((d) => d.kind === 'fruta');
  const defects = detections.filter((d) => d.kind === 'defecto');

  return (
    <div
      className="relative mx-auto"
      style={ratio ? { aspectRatio: ratio, width: `min(100%, calc(${maxHeight} * ${ratio}))` } : { width: '100%' }}
    >
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          if (w && h) setRatio(w / h);
        }}
        className={`block w-full ${ratio ? 'h-full object-contain' : 'h-auto'}`}
        style={ratio ? undefined : { maxHeight }}
      />
      {visible && ratio && detections.length > 0 && (
        <>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none animate-fundido"
            aria-hidden="true"
          >
            {fruits.map((d, i) => {
              const shapes = shapesOf(d);
              return (
                <path
                  key={`f${i}`}
                  d={shapes.length ? toPath(shapes) : boxPath(d.box)}
                  fill={shapes.length ? color : 'none'}
                  fillOpacity={0.16}
                  fillRule="evenodd"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {defects.map((d, i) => {
              const shapes = shapesOf(d);
              return (
                <path
                  key={`d${i}`}
                  d={shapes.length ? toPath(shapes) : boxPath(d.box)}
                  fill="var(--color-terracota-500)"
                  fillOpacity={shapes.length ? 0.55 : 0.35}
                  stroke="#ffffff"
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          {fruits.slice(0, 4).map((d, i) => {
            const above = d.box[1] > 0.12;
            return (
              <span
                key={`l${i}`}
                className={`absolute rounded-md bg-hoja-950/85 px-1.5 py-0.5 font-mono text-[11px] font-medium text-papel-claro pointer-events-none whitespace-nowrap ${
                  above ? '-translate-y-full -mt-1' : 'mt-1'
                }`}
                style={{ left: `${Math.min(Math.max(d.box[0], 0.01), 0.6) * 100}%`, top: `${Math.max(d.box[1], 0) * 100}%` }}
              >
                {d.label.replace('_', ' ')} {Math.round(d.confidence * 100)}%
              </span>
            );
          })}
        </>
      )}
    </div>
  );
};
