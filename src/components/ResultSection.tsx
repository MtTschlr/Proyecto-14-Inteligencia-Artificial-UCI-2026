import React from 'react';
import type { FruitClassification, FruitQualityState } from '../types';
import { PrinterIcon, PlusIcon, CheckIcon, AlertIcon } from './CustomIcons';

interface ResultSectionProps {
  result: FruitClassification | null;
  isProcessing: boolean;
  onGenerateLabel: (result: FruitClassification) => void;
  onNewCapture: () => void;
}

function getStateSolidStyle(state: FruitQualityState): {
  bgClass: string;
  textClass: string;
  badgeLabel: string;
} {
  switch (state) {
    case 'VERDE':
      return {
        bgClass: 'bg-emerald-700',
        textClass: 'text-white',
        badgeLabel: 'VERDE (INMADURO)',
      };
    case 'MADURO':
      return {
        bgClass: 'bg-emerald-300',
        textClass: 'text-slate-950',
        badgeLabel: 'MADURO (ÓPTIMO)',
      };
    case 'SOBREPASADO':
      return {
        bgClass: 'bg-red-700',
        textClass: 'text-white',
        badgeLabel: 'SOBREPASADO',
      };
    default:
      return {
        bgClass: 'bg-slate-800',
        textClass: 'text-white',
        badgeLabel: 'DESCONOCIDO',
      };
  }
}

export const ResultSection: React.FC<ResultSectionProps> = ({
  result,
  isProcessing,
  onGenerateLabel,
  onNewCapture,
}) => {
  if (isProcessing) {
    return (
      <section id="result-section" className="bg-black text-white border-3 border-black rounded-3xl p-6 mb-6 shadow-xl scroll-mt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 border-8 border-white border-t-emerald-300 rounded-full animate-spin mb-4" />
          <h2 className="text-2xl font-brand font-black tracking-wider text-emerald-300 mb-2">
            Inferencia en proceso...
          </h2>
          <p className="font-sans text-xs text-slate-300 max-w-sm">
            Analizando pigmentación, manchas e imperfecciones en la fruta
          </p>
          <div className="w-full max-w-md bg-slate-900 h-4 rounded-full border-2 border-white mt-6 overflow-hidden">
            <div className="bg-emerald-300 h-full w-3/4 animate-pulse rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section id="result-section" className="bg-white border-2 border-slate-900 rounded-3xl p-6 mb-6 text-center shadow-md scroll-mt-6">
        <p className="font-mono font-bold text-sm text-black">
          Toma una foto o selecciona una muestra para ver el resultado de clasificación.
        </p>
      </section>
    );
  }

  const stateStyle = getStateSolidStyle(result.state);

  return (
    <section id="result-section" className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-7 mb-6 shadow-lg scroll-mt-6">
      {/* Header Result */}
      <div className="flex flex-row items-center justify-between gap-3 border-b-2 border-slate-200 pb-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              Resultado IA
            </span>
            <span className="font-mono text-xs font-bold text-slate-500 truncate">
              {result.timestamp} • {result.lotId}
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-brand font-black text-black tracking-tight truncate">
            {result.fruitType}
          </h2>
        </div>

        <div className="bg-emerald-200 border-2 border-black rounded-xl px-3 py-1.5 shrink-0 shadow-sm text-right">
          <span className="block text-[9px] sm:text-[10px] text-black font-black leading-tight">Confianza IA</span>
          <span className="font-mono text-sm sm:text-base font-black text-black">{(result.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Quality Badge Banner */}
      <div
        className={`w-full ${stateStyle.bgClass} ${stateStyle.textClass} border-3 border-black rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm`}
      >
        <div className="flex items-center gap-3">
          {result.state === 'VERDE' || result.state === 'MADURO' ? (
            <div className="p-2 bg-black text-white rounded-xl border border-white">
              <CheckIcon size={24} />
            </div>
          ) : (
            <div className="p-2 bg-black text-white rounded-xl border border-white">
              <AlertIcon size={24} />
            </div>
          )}
          <div>
            <span className="block text-xs font-bold opacity-90">Clasificación oficial</span>
            <span className="text-xl sm:text-2xl font-brand font-black tracking-wide">
              {stateStyle.badgeLabel}
            </span>
          </div>
        </div>
        <div className="bg-black text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white self-stretch sm:self-auto flex items-center justify-center">
          Calidad Grade {result.state === 'MADURO' ? 'A' : result.state === 'VERDE' ? 'B' : 'C'}
        </div>
      </div>

      {/* Grid of Solid Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4">
          <span className="block text-xs font-bold text-slate-700 mb-1">
            % Imperfección estimada
          </span>
          <div className="flex items-baseline gap-2 mb-1 font-mono">
            <span className="text-3xl font-black text-black">
              {result.imperfectionPercentage.toFixed(1)}%
            </span>
            <span className="text-xs font-bold text-slate-600 font-sans">
              ({result.imperfectionPercentage < 5 ? 'Leve' : result.imperfectionPercentage < 12 ? 'Moderada' : 'Elevada'})
            </span>
          </div>
          <p className="text-xs font-medium text-slate-700 border-t border-slate-300 pt-2 mt-1">
            {result.imperfectionDetails}
          </p>
        </div>

        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4">
          <span className="block text-xs font-bold text-slate-700 mb-1">
            Vida útil estimada
          </span>
          <div className="text-2xl sm:text-3xl font-black text-black font-mono mb-1">
            {result.shelfLifeDays}
          </div>
          <p className="text-xs font-medium text-slate-700 border-t border-slate-300 pt-2 mt-1">
            Recomendación para mantener frescura óptima.
          </p>
        </div>

        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4">
          <span className="block text-xs font-bold text-slate-700 mb-1">
            Calibre y peso
          </span>
          <div className="text-xl font-black text-black font-mono mb-1">
            {result.caliber}
          </div>
          <p className="text-xs font-medium text-slate-700 border-t border-slate-300 pt-2 mt-1">
            Estimación: {result.estimatedWeight}
          </p>
        </div>

        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4">
          <span className="block text-xs font-bold text-slate-700 mb-1">
            Recomendación logística
          </span>
          <div className="text-xs sm:text-sm font-bold text-black leading-snug mb-1">
            {result.suggestedAction}
          </div>
          <p className="text-xs font-medium text-slate-700 border-t border-slate-300 pt-2 mt-1">
            Asignar despacho según la urgencia requerida.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t-2 border-slate-200">
        <button
          onClick={() => onGenerateLabel(result)}
          className="flex-1 bg-black text-white hover:bg-slate-900 border-2 border-black py-3.5 px-5 rounded-2xl font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-md"
        >
          <PrinterIcon size={20} />
          Generar etiqueta
        </button>

        <button
          onClick={onNewCapture}
          className="flex-1 bg-white text-black hover:bg-emerald-200 border-2 border-black py-3.5 px-5 rounded-2xl font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm"
        >
          <PlusIcon size={20} />
          Nueva captura
        </button>
      </div>
    </section>
  );
};
