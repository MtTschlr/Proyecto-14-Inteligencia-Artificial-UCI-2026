import React from 'react';
import type { Detection } from '../types';

interface DetectionOverlayProps {
  src: string;
  alt: string;
  detections: Detection[];
  color: string;
  visible: boolean;
  imgClassName?: string;
}

const toPoints = (polygon: [number, number][]) => polygon.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(' ');

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  src,
  alt,
  detections,
  color,
  visible,
  imgClassName = 'max-h-[46vh] lg:max-h-[340px]',
}) => {
  const fruits = detections.filter((d) => d.kind === 'fruta');
  const defects = detections.filter((d) => d.kind === 'defecto');

  return (
    <div className="relative w-fit max-w-full mx-auto">
      <img src={src} alt={alt} className={`block w-auto max-w-full h-auto ${imgClassName}`} />
      {visible && detections.length > 0 && (
        <>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none animate-fundido"
            aria-hidden="true"
          >
            {fruits.map((d, i) =>
              d.polygon ? (
                <polygon
                  key={`f${i}`}
                  points={toPoints(d.polygon)}
                  fill={color}
                  fillOpacity={0.16}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <rect
                  key={`f${i}`}
                  x={d.box[0] * 100}
                  y={d.box[1] * 100}
                  width={(d.box[2] - d.box[0]) * 100}
                  height={(d.box[3] - d.box[1]) * 100}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                />
              )
            )}
            {defects.map((d, i) =>
              d.polygon ? (
                <polygon
                  key={`d${i}`}
                  points={toPoints(d.polygon)}
                  fill="var(--color-terracota-500)"
                  fillOpacity={0.55}
                  stroke="#ffffff"
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <rect
                  key={`d${i}`}
                  x={d.box[0] * 100}
                  y={d.box[1] * 100}
                  width={(d.box[2] - d.box[0]) * 100}
                  height={(d.box[3] - d.box[1]) * 100}
                  fill="var(--color-terracota-500)"
                  fillOpacity={0.35}
                  stroke="#ffffff"
                  strokeWidth={1.75}
                  vectorEffect="non-scaling-stroke"
                />
              )
            )}
          </svg>
          {fruits.slice(0, 4).map((d, i) => (
            <span
              key={`l${i}`}
              className="absolute -translate-y-full -mt-1 rounded-md bg-hoja-950/85 px-1.5 py-0.5 font-mono text-[11px] font-medium text-papel-claro pointer-events-none"
              style={{ left: `${Math.min(d.box[0], 0.7) * 100}%`, top: `${Math.max(d.box[1], 0.08) * 100}%` }}
            >
              {d.label.replace('_', ' ')} {Math.round(d.confidence * 100)}%
            </span>
          ))}
        </>
      )}
    </div>
  );
};
