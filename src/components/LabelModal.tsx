import React, { useEffect } from 'react';
import type { FruitClassification, FruitQualityState } from '../types';
import { PrinterIcon, CloseIcon } from './CustomIcons';

interface LabelModalProps {
  result: FruitClassification | null;
  onClose: () => void;
}

function getLabelBadgeStyle(state: FruitQualityState): { bgClass: string } {
  switch (state) {
    case 'VERDE':
      return { bgClass: 'bg-emerald-400' };
    case 'MADURO':
      return { bgClass: 'bg-emerald-300' };
    case 'SOBREPASADO':
      return { bgClass: 'bg-red-400' };
    default:
      return { bgClass: 'bg-slate-300' };
  }
}

export const LabelModal: React.FC<LabelModalProps> = ({ result, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!result) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const uniqueNum = Date.now().toString().slice(-6);
    document.title = `SacredFruit_Etiqueta_${result.lotId}_${uniqueNum}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const badgeStyle = getLabelBadgeStyle(result.state);
  const shortId = result.id.startsWith('SCAN-') ? result.id.replace('SCAN-', '') : result.id;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto p-3 sm:p-6 flex items-start sm:items-center justify-center min-h-full">
      <div className="bg-white border-3 border-black rounded-3xl w-full max-w-lg p-4 sm:p-6 relative my-4 sm:my-auto shadow-2xl max-h-[95vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black text-white p-2 rounded-full border-2 border-black hover:bg-slate-800 transition-colors z-10"
          title="Cerrar modal"
        >
          <CloseIcon size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-3 text-center border-b-2 border-slate-200 pb-2.5 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <img src="/sacred-apple.png" alt="Sacred Fruit" className="w-8 h-8 object-contain" />
            <h3 className="text-2xl font-brand font-black text-black">Sacred Fruit</h3>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto pr-1 flex-1">
          {/* Printable Label Container */}
          <div id="thermal-label-print-area" className="bg-white border-3 border-black p-3.5 sm:p-4 font-mono text-black text-xs sm:text-sm rounded-2xl mb-4 shadow-sm">
            {/* REGISTRO & FECHA/HORA strictly on 1 single line */}
            <div className="flex justify-between items-center border-b-2 border-black pb-1.5 mb-2.5 font-black text-[10px] sm:text-[11px] whitespace-nowrap">
              <span className="truncate">REG: #{shortId}</span>
              <span className="shrink-0 ml-2">FECHA/HORA: {result.timestamp}</span>
            </div>

            {/* Centered Lot Assigned */}
            <div className="mb-2.5 text-center">
              <span className="text-[11px] font-bold text-slate-600 block uppercase">LOTE ASIGNADO:</span>
              <span className="text-lg font-black uppercase tracking-wider bg-emerald-200 px-3.5 py-0.5 border border-black inline-block rounded-md mt-0.5">
                {result.lotId}
              </span>
            </div>

            {/* Product Name */}
            <div className="mb-2.5">
              <span className="text-[11px] font-bold text-slate-600 block uppercase">PRODUCTO:</span>
              <h4 className="text-xl sm:text-2xl font-black uppercase leading-tight tracking-tight break-words block mt-0.5">
                {result.fruitType}
              </h4>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">{result.caliber}</span>
            </div>

            {/* Classification Pill */}
            <div className={`border-2 border-black p-2.5 text-center mb-2.5 rounded-xl ${badgeStyle.bgClass} text-black`}>
              <span className="text-[11px] font-black block text-black uppercase tracking-wider">ESTADO CLASIFICADO:</span>
              <span className="text-2xl font-black uppercase tracking-widest text-black block mt-0.5">
                [{result.state}]
              </span>
            </div>

            {/* Metric lines */}
            <div className="space-y-1.5 text-xs border-y-2 border-black py-2 mb-2.5 font-bold">
              <div className="flex justify-between items-center">
                <span className="uppercase whitespace-nowrap">IMPERFECCIÓN:</span>
                <span className="font-black text-right ml-2">{result.imperfectionPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="uppercase shrink-0 font-bold whitespace-nowrap">VIDA ÚTIL:</span>
                <span className="font-black text-right ml-2 truncate">{result.shelfLifeDays}</span>
              </div>
            </div>

            <div className="mb-2.5">
              <span className="text-[10px] font-bold text-slate-600 block uppercase">DESTINO LOGÍSTICO:</span>
              <span className="text-xs font-black uppercase block leading-tight">{result.suggestedAction}</span>
            </div>

            {/* Barcode */}
            <div className="text-center pt-2 border-t-2 border-black">
              <div className="inline-block bg-white p-1.5 border-2 border-black rounded-lg mb-1">
                <svg width="210" height="42" viewBox="0 0 220 48" fill="black" className="block mx-auto">
                  <rect x="0" y="0" width="4" height="48" fill="black" />
                  <rect x="6" y="0" width="2" height="48" fill="black" />
                  <rect x="12" y="0" width="6" height="48" fill="black" />
                  <rect x="22" y="0" width="2" height="48" fill="black" />
                  <rect x="28" y="0" width="4" height="48" fill="black" />
                  <rect x="36" y="0" width="8" height="48" fill="black" />
                  <rect x="48" y="0" width="2" height="48" fill="black" />
                  <rect x="54" y="0" width="6" height="48" fill="black" />
                  <rect x="64" y="0" width="4" height="48" fill="black" />
                  <rect x="72" y="0" width="2" height="48" fill="black" />
                  <rect x="78" y="0" width="8" height="48" fill="black" />
                  <rect x="90" y="0" width="4" height="48" fill="black" />
                  <rect x="98" y="0" width="2" height="48" fill="black" />
                  <rect x="104" y="0" width="6" height="48" fill="black" />
                  <rect x="114" y="0" width="4" height="48" fill="black" />
                  <rect x="122" y="0" width="8" height="48" fill="black" />
                  <rect x="134" y="0" width="2" height="48" fill="black" />
                  <rect x="140" y="0" width="6" height="48" fill="black" />
                  <rect x="150" y="0" width="4" height="48" fill="black" />
                  <rect x="158" y="0" width="2" height="48" fill="black" />
                  <rect x="164" y="0" width="8" height="48" fill="black" />
                  <rect x="176" y="0" width="4" height="48" fill="black" />
                  <rect x="184" y="0" width="2" height="48" fill="black" />
                  <rect x="190" y="0" width="6" height="48" fill="black" />
                  <rect x="200" y="0" width="4" height="48" fill="black" />
                  <rect x="208" y="0" width="8" height="48" fill="black" />
                </svg>
              </div>
              <p className="text-[10px] font-mono font-black tracking-wider uppercase text-slate-900">
                *{result.id}-{result.lotId}*
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 shrink-0 border-t-2 border-slate-200 mt-1">
          <button
            onClick={handlePrint}
            className="flex-1 bg-black text-white hover:bg-emerald-600 border-2 border-black py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02]"
          >
            <PrinterIcon size={20} />
            Imprimir etiqueta
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-black hover:bg-slate-200 border-2 border-black py-3 px-4 rounded-2xl font-bold text-sm transition-all"
          >
            Volver a la App
          </button>
        </div>
      </div>
    </div>
  );
};
