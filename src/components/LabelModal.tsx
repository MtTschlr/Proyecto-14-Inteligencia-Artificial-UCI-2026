import React from 'react';
import type { FruitClassification } from '../types';
import { PrinterIcon, CloseIcon } from './CustomIcons';
import { Sheet } from './Sheet';

interface LabelModalProps {
  result: FruitClassification | null;
  onClose: () => void;
}

const TEETH = 22;
const TOOTH = 9;

const zigzagPath = (() => {
  const top = Array.from({ length: TEETH * 2 + 1 }, (_, i) => `${((i / (TEETH * 2)) * 100).toFixed(3)}% ${i % 2 ? 0 : TOOTH}px`);
  const bottom = Array.from({ length: TEETH * 2 + 1 }, (_, i) => {
    const k = TEETH * 2 - i;
    return `${((k / (TEETH * 2)) * 100).toFixed(3)}% calc(100% - ${k % 2 ? 0 : TOOTH}px)`;
  });
  return `polygon(${[...top, ...bottom].join(', ')})`;
})();

export const LabelModal: React.FC<LabelModalProps> = ({ result, onClose }) => {
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

  const shortId = result.id.startsWith('SCAN-') ? result.id.replace('SCAN-', '') : result.id;

  return (
    <Sheet onClose={onClose} labelledBy="label-title" widthClass="sm:max-w-lg">
      <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/sacred-apple.png" alt="" className="w-10 h-10 rounded-lg" />
          <div>
            <h3 id="label-title" className="font-serif text-xl font-semibold text-hoja-900 leading-tight">Etiqueta térmica</h3>
            <p className="text-xs text-tinta-tenue">Papel de 80 mm, blanco y negro</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="w-11 h-11 flex items-center justify-center rounded-full text-tinta-suave hover:bg-papel-hondo transition-colors"
        >
          <CloseIcon size={24} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 bg-salvia-200/70 px-4 py-6 sm:px-8">
        <div className="relative mx-auto w-full max-w-88">
          <div aria-hidden="true" className="absolute inset-0" style={{ filter: 'drop-shadow(0 8px 10px rgb(14 34 23 / 0.3))' }}>
            <div className="w-full h-full bg-white" style={{ clipPath: zigzagPath }} />
          </div>

          <div className="relative px-4 py-8">
            <div id="thermal-label-print-area" className="bg-white border-2 border-black p-3.5 sm:p-4 font-mono text-black text-xs sm:text-sm">
              {/* REGISTRO & FECHA/HORA strictly on 1 single line */}
              <div className="flex justify-between items-center border-b-2 border-black pb-1.5 mb-2.5 font-black text-[10px] sm:text-[11px] whitespace-nowrap">
                <span className="truncate">REG: #{shortId}</span>
                <span className="shrink-0 ml-2">FECHA/HORA: {result.timestamp}</span>
              </div>

              <div className="mb-2.5 text-center">
                <span className="text-[11px] font-bold text-black block uppercase">LOTE ASIGNADO:</span>
                <span className="text-lg font-black uppercase tracking-wider px-3.5 py-0.5 border-2 border-black inline-block mt-0.5">
                  {result.lotId}
                </span>
              </div>

              <div className="mb-2.5">
                <span className="text-[11px] font-bold text-black block uppercase">PRODUCTO:</span>
                <h4 className="text-xl sm:text-2xl font-black uppercase leading-tight tracking-tight break-words block mt-0.5">
                  {result.fruitType}
                </h4>
                <span className="text-xs font-bold text-black block mt-0.5">{result.caliber}</span>
              </div>

              <div className="border-4 border-double border-black p-2.5 text-center mb-2.5 text-black">
                <span className="text-[11px] font-black block text-black uppercase tracking-wider">ESTADO CLASIFICADO:</span>
                <span className="text-2xl font-black uppercase tracking-widest text-black block mt-0.5">
                  [{result.state}]
                </span>
              </div>

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
                <span className="text-[10px] font-bold text-black block uppercase">DESTINO LOGÍSTICO:</span>
                <span className="text-xs font-black uppercase block leading-tight">{result.suggestedAction}</span>
              </div>

              <div className="text-center pt-2 border-t-2 border-black">
                <div className="inline-block bg-white p-1.5 border-2 border-black mb-1">
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
                <p className="text-[10px] font-mono font-black tracking-wider uppercase text-black">
                  *{result.id}-{result.lotId}*
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 border-t border-linea">
        <button
          onClick={onClose}
          className="flex-1 min-h-12 border border-linea text-tinta hover:bg-papel-hondo rounded-xl font-semibold text-sm transition-colors"
        >
          Volver a la app
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 min-h-12 bg-hoja-800 text-papel-claro hover:bg-hoja-700 active:bg-hoja-950 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <PrinterIcon size={20} />
          Imprimir etiqueta
        </button>
      </div>
    </Sheet>
  );
};
