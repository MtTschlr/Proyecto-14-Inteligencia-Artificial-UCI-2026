import React, { useState } from 'react';
import type { FruitClassification } from '../types';
import {
  PrinterIcon,
  PlusIcon,
  EyeIcon,
  EyeOffIcon,
  RulerIcon,
  BoxIcon,
  TruckIcon,
  LeafIcon,
} from './CustomIcons';
import { DetectionOverlay } from './DetectionOverlay';
import { ProcessingView } from './ProcessingView';
import { StateBadge } from './StateBadge';
import { ConfidenceRing, ImperfectionMeter, MaturityScale, ShelfTimeline, SpecRow } from './ResultParts';
import { getStateStyle } from '../lib/stateStyle';

interface ResultSectionProps {
  result: FruitClassification | null;
  isProcessing: boolean;
  pendingImage?: string | null;
  onGenerateLabel: (result: FruitClassification) => void;
  onNewCapture: () => void;
}

const EmptyResult: React.FC = () => (
  <section
    id="result-section"
    className="hidden lg:flex flex-col items-center text-center bg-papel-claro border border-dashed border-linea rounded-2xl px-8 py-14 scroll-mt-20"
  >
    <div className="relative w-28 h-28 mb-6">
      <span className="absolute inset-0 rounded-full bg-salvia-100" />
      <span className="absolute inset-3 rounded-full bg-salvia-200" />
      <span className="absolute inset-0 flex items-center justify-center text-hoja-700">
        <LeafIcon size={44} />
      </span>
    </div>
    <h2 className="font-serif text-2xl font-semibold text-hoja-900 mb-2">Aquí aparecerá el resultado</h2>
    <p className="text-sm text-tinta-suave max-w-xs">
      Toma una foto del lote o elige una muestra de prueba. Verás la madurez, las manchas y la vida útil estimada.
    </p>
    <ul className="flex flex-wrap justify-center gap-2 mt-6 text-xs text-tinta-suave">
      {['Madurez', 'Imperfección', 'Vida útil', 'Etiqueta'].map((item) => (
        <li key={item} className="rounded-full bg-papel-hondo px-3 py-1">
          {item}
        </li>
      ))}
    </ul>
  </section>
);

export const ResultSection: React.FC<ResultSectionProps> = ({
  result,
  isProcessing,
  pendingImage,
  onGenerateLabel,
  onNewCapture,
}) => {
  const [showDetections, setShowDetections] = useState<boolean>(true);

  if (isProcessing) {
    return <ProcessingView image={pendingImage} />;
  }

  if (!result) {
    return <EmptyResult />;
  }

  const style = getStateStyle(result.state);
  const detections = result.detections ?? [];
  const damagedZones = detections.filter((d) => d.kind === 'defecto').length;

  return (
    <section
      key={result.id}
      id="result-section"
      className="bg-papel-claro border border-linea rounded-2xl shadow-hoja-lg overflow-hidden scroll-mt-20 animate-aparecer"
    >
      <div className="relative bg-hoja-950 min-h-[220px] flex items-center [--alto-foto:clamp(220px,58dvh,560px)] lg:[--alto-foto:340px]">
        <DetectionOverlay
          src={result.imageUrl}
          alt={`Foto de ${result.fruitType}`}
          detections={detections}
          color={style.color}
          visible={showDetections}
          maxHeight="var(--alto-foto)"
        />
        {result.source === 'demo' && (
          <span className="absolute top-3 left-3 rounded-full bg-hoja-950/80 text-papel-claro text-xs font-medium px-3 py-1.5">
            Demo: detecciones simuladas
          </span>
        )}
        {detections.length > 0 && (
          <button
            onClick={() => setShowDetections((v) => !v)}
            aria-pressed={showDetections}
            className="absolute bottom-3 right-3 min-h-11 flex items-center gap-2 rounded-full bg-hoja-950/80 hover:bg-hoja-950 text-papel-claro text-sm font-medium px-4 transition-colors"
          >
            {showDetections ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            {showDetections ? 'Ocultar zonas' : 'Ver zonas'}
          </button>
        )}
      </div>

      {detections.length > 0 && showDetections && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2.5 bg-papel-hondo text-xs text-tinta-suave">
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm border-2" style={{ borderColor: style.color, backgroundColor: `color-mix(in srgb, ${style.color} 25%, transparent)` }} />
            Fruta detectada
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-terracota-500/60 border border-white" />
            Zonas dañadas: {damagedZones}
          </span>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-tinta-tenue mb-1 truncate">
              {result.lotId} · {result.timestamp}
            </p>
            <h2 className="font-serif text-4xl font-semibold text-hoja-900 leading-none mb-3 break-words">{result.fruitType}</h2>
            <StateBadge state={result.state} size="md" withHint />
          </div>
          <ConfidenceRing value={result.confidence} />
        </div>

        <div className="mt-6 pt-5 border-t border-dashed border-linea">
          <h3 className="font-serif text-lg font-semibold text-hoja-800 mb-1">Escala de madurez</h3>
          <MaturityScale state={result.state} />
        </div>

        <div className="mt-6 pt-5 border-t border-dashed border-linea">
          <h3 className="font-serif text-lg font-semibold text-hoja-800 mb-3">Imperfección</h3>
          <ImperfectionMeter percentage={result.imperfectionPercentage} details={result.imperfectionDetails} />
        </div>

        <div className="mt-6 pt-5 border-t border-dashed border-linea">
          <h3 className="font-serif text-lg font-semibold text-hoja-800 mb-3">Vida útil estimada</h3>
          <ShelfTimeline text={result.shelfLifeDays} state={result.state} />
        </div>

        <dl className="mt-6 pt-2 border-t border-dashed border-linea divide-y divide-linea-suave">
          <SpecRow icon={<RulerIcon size={18} />} label="Calibre" value={result.caliber} />
          <SpecRow icon={<BoxIcon size={18} />} label="Peso estimado" value={result.estimatedWeight} />
          <SpecRow icon={<TruckIcon size={18} />} label="Recomendación logística" value={result.suggestedAction} />
        </dl>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => onGenerateLabel(result)}
            className="flex-1 min-h-13 bg-hoja-800 text-papel-claro hover:bg-hoja-700 active:bg-hoja-950 px-5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors shadow-hoja"
          >
            <PrinterIcon size={20} />
            Generar etiqueta
          </button>

          <button
            onClick={onNewCapture}
            className="flex-1 min-h-13 bg-transparent text-hoja-800 border border-hoja-700/50 hover:bg-salvia-100 active:bg-salvia-200 px-5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
          >
            <PlusIcon size={20} />
            Nueva captura
          </button>
        </div>
      </div>
    </section>
  );
};
