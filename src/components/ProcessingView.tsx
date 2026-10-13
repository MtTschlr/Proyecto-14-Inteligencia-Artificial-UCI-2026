import React, { useEffect, useState } from 'react';
import { CornerGuides } from './CornerGuides';
import { LeafIcon } from './CustomIcons';

const PHASES = ['Analizando pigmentación', 'Midiendo manchas', 'Estimando vida útil'];

interface ProcessingViewProps {
  image?: string | null;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ image }) => {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1100);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="result-section"
      aria-live="polite"
      className="bg-papel-claro border border-linea rounded-2xl shadow-hoja-lg overflow-hidden scroll-mt-20 animate-aparecer"
    >
      <div className="relative bg-hoja-950 min-h-56">
        {image ? (
          <img src={image} alt="Foto en análisis" className="block w-full max-h-[46vh] lg:max-h-[340px] object-contain mx-auto opacity-90" />
        ) : (
          <div className="h-56 flex items-center justify-center text-salvia-400">
            <LeafIcon size={48} />
          </div>
        )}
        <CornerGuides inset="inset-3" />
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 h-0.5 bg-lima-300 shadow-[0_0_14px_4px_rgb(211_226_122/0.65)] animate-escaneo"
        />
      </div>

      <div className="p-5 text-center">
        <h2 key={phase} className="font-serif text-xl font-semibold text-hoja-900 animate-fundido">
          {PHASES[phase]}
        </h2>
        <p className="text-sm text-tinta-suave mt-1">El modelo está revisando la fruta. Son unos segundos.</p>
        <div className="flex justify-center gap-1.5 mt-4" aria-hidden="true">
          {PHASES.map((name, i) => (
            <span
              key={name}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === phase ? 'w-8 bg-hoja-700' : 'w-1.5 bg-linea'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
