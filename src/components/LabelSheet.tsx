import type { FruitClassification } from '../types';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

const BARS = [4, 2, 6, 2, 4, 8, 2, 6, 4, 2, 8, 4, 2, 6, 4, 8, 2, 6, 4, 2, 8, 4, 2, 6, 4, 8];

export function LabelSheet({ result, onClose }: { result: FruitClassification; onClose: () => void }) {
  const print = () => {
    const title = document.title;
    document.title = `SacredFruit_Etiqueta_${result.lotId}`;
    window.print();
    setTimeout(() => (document.title = title), 1000);
  };
  let x = 0;
  const bars = BARS.map((w, i) => {
    const rect = <rect key={i} x={x} y={0} width={w} height={48} />;
    x += w + 2 + (i % 3);
    return rect;
  });

  return (
    <Sheet onClose={onClose} labelledBy="etiqueta-titulo" width="sm:max-w-lg">
      <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
        <div>
          <h3 id="etiqueta-titulo" className="font-display text-2xl font-extrabold">Etiqueta del lote</h3>
          <p className="text-xs text-tinta-3">Papel térmico de 80 mm, blanco y negro</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="w-11 h-11 rounded-full hover:bg-piedra-2 flex items-center justify-center">
          <Icon name="cross-small" size={22} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 bg-piedra-2 px-4 py-6">
        <div id="etiqueta-termica" className="mx-auto w-full max-w-80 bg-white text-black p-4 font-mono text-xs shadow-ficha">
          <div className="flex justify-between border-b-2 border-black pb-1.5 mb-2.5 font-bold text-[10px]">
            <span>SACRED FRUIT</span>
            <span>{result.timestamp}</span>
          </div>
          <p className="text-[10px] font-bold">LOTE</p>
          <p className="text-xl font-black tracking-wider">{result.lotId}</p>
          <p className="text-[10px] font-bold mt-2">PRODUCTO</p>
          <p className="text-2xl font-black uppercase leading-tight">{result.fruitType}</p>
          <p className="text-[11px] font-bold">{result.caliber}</p>
          <div className="border-4 border-double border-black text-center py-2 my-3">
            <p className="text-[10px] font-bold">ESTADO</p>
            <p className="text-2xl font-black tracking-widest">{result.state}</p>
          </div>
          <div className="space-y-1 border-y-2 border-black py-2 font-bold">
            <p className="flex justify-between"><span>IMPERFECCIÓN</span><span>{result.imperfectionPercentage.toFixed(1)} %</span></p>
            <p className="flex justify-between"><span>VIDA ÚTIL</span><span>{result.shelfLifeDays}</span></p>
            <p className="flex justify-between"><span>CONFIANZA</span><span>{Math.round(result.confidence * 100)} %</span></p>
          </div>
          <p className="text-[10px] font-bold mt-2">DESTINO</p>
          <p className="font-black uppercase leading-tight">{result.suggestedAction}</p>
          <svg viewBox={`0 0 ${x} 48`} className="w-full h-10 mt-3" fill="black" aria-hidden="true">{bars}</svg>
          <p className="text-center text-[9px] font-bold mt-1">*{result.id}*</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button onClick={onClose} className="min-h-12 rounded-2xl bg-piedra-2 hover:bg-piedra-3 font-bold">Volver</button>
        <button onClick={print} className="min-h-12 rounded-2xl bg-anil-700 hover:bg-anil-600 text-hoja font-bold flex items-center justify-center gap-2">
          <Icon name="print" size={18} />
          Imprimir
        </button>
      </div>
    </Sheet>
  );
}
