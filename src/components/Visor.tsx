import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const Corners = () => (
  <div aria-hidden="true" className="absolute inset-4 pointer-events-none">
    {['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
      <span key={c} className={`absolute w-9 h-9 border-lima-400 ${c}`} />
    ))}
  </div>
);

interface EmptyVisorProps {
  onCamera: () => void;
  onGallery: () => void;
  onDropFile: (file: File) => void;
}

export function EmptyVisor({ onCamera, onGallery, onDropFile }: EmptyVisorProps) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onDropFile(file);
      }}
      className={`relative aspect-[4/5] sm:aspect-[4/3] rounded-[28px] overflow-hidden bg-anil-950 cuadricula transition-colors ${dragging ? 'bg-anil-800' : ''}`}
    >
      <Corners />
      <div className="absolute inset-0 flex flex-col justify-end px-7 pt-7 pb-10 sm:px-10 sm:pb-11">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lima-300 mb-2">Visor de inspección</p>
        <h2 className="font-display text-[2rem] sm:text-4xl font-extrabold text-hoja leading-[1.02] max-w-[14ch]">
          Fotografiá el lote y el modelo hace el resto
        </h2>
        <p className="text-anil-300 text-sm mt-3 max-w-sm">
          Banana, mango, naranja o tomate. Una foto por lote, con la fruta completa y buena luz.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button
            onClick={onCamera}
            className="min-h-14 rounded-2xl bg-lima-400 hover:bg-lima-300 text-anil-950 font-bold text-base flex items-center justify-center gap-2.5 transition-colors"
          >
            <Icon name="camera" size={20} />
            Sacar foto
          </button>
          <button
            onClick={onGallery}
            className="min-h-14 rounded-2xl bg-anil-800 hover:bg-anil-700 text-hoja font-bold text-base flex items-center justify-center gap-2.5 transition-colors"
          >
            <Icon name="picture" size={20} />
            Galería
          </button>
        </div>
        <p className="hidden lg:block text-xs text-anil-300 mt-3">También podés arrastrar una foto hasta acá.</p>
      </div>
    </div>
  );
}

interface PhotoFrameProps {
  src: string | null;
  scanning?: boolean;
  dim?: boolean;
  children?: ReactNode;
}

export function PhotoFrame({ src, scanning = false, dim = false, children }: PhotoFrameProps) {
  return (
    <div className="relative rounded-[28px] overflow-hidden bg-anil-950 min-h-64 flex items-center justify-center">
      {src ? (
        <img src={src} alt="Foto del lote" className={`block w-full max-h-[64dvh] lg:max-h-[70dvh] object-contain transition-opacity ${dim ? 'opacity-55' : ''}`} />
      ) : (
        <div className="h-72 w-full flex flex-col items-center justify-center gap-3 text-anil-300 rayado">
          <Icon name="image-slash" size={40} />
          <span className="text-sm">No se puede mostrar una vista previa de este archivo</span>
        </div>
      )}
      {scanning && (
        <>
          <div aria-hidden="true" className="absolute inset-0 bg-anil-950/25" />
          <div aria-hidden="true" className="absolute left-0 right-0 h-0.5 bg-lima-400 shadow-[0_0_18px_6px_rgb(211_242_90/0.55)] animate-barrido" />
          <Corners />
        </>
      )}
      {children}
    </div>
  );
}

export function ElapsedCounter() {
  const [seconds, setSeconds] = useState(0);
  const started = useRef(0);
  useEffect(() => {
    started.current = performance.now();
    const timer = setInterval(() => setSeconds((performance.now() - started.current) / 1000), 100);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-mono tabular">{seconds.toFixed(1)} s</span>;
}
