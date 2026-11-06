import type { FruitClassification, Sample } from '../types';
import { fruitIcon, stateStyle } from '../lib/states';
import { Icon } from './Icon';

export function LotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor="lote" className="flex items-center gap-3 min-h-15 px-4 rounded-3xl bg-hoja shadow-ficha cursor-text">
      <span className="w-9 h-9 rounded-xl bg-anil-950 text-lima-300 flex items-center justify-center shrink-0">
        <Icon name="barcode-read" size={17} />
      </span>
      <span className="text-xs font-semibold text-tinta-3 shrink-0">Lote</span>
      <input
        id="lote"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="LOTE-001"
        autoCapitalize="characters"
        spellCheck={false}
        className="w-full min-w-0 bg-transparent font-mono font-semibold text-lg tracking-wide focus:outline-none placeholder:text-tinta-3/60"
      />
    </label>
  );
}

interface SampleStripProps {
  samples: Sample[];
  selected?: string;
  disabled: boolean;
  onPick: (sample: Sample) => void;
}

export function SampleStrip({ samples, selected, disabled, onPick }: SampleStripProps) {
  if (!samples.length) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="font-display font-bold text-lg">Fotos de prueba</h3>
        <span className="text-xs text-tinta-3">Tocá una para analizarla</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto snap-x sin-barra -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible pb-1">
        {samples.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s)}
            disabled={disabled}
            aria-pressed={selected === s.id}
            className={`snap-start shrink-0 w-28 lg:w-auto text-left rounded-2xl p-1.5 transition-colors disabled:opacity-50 ${
              selected === s.id ? 'bg-anil-950 text-hoja' : 'bg-hoja hover:bg-piedra-2 shadow-ficha'
            }`}
          >
            <img src={s.file} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-xl bg-piedra-2" />
            <span className="block text-xs font-semibold mt-1.5 px-1 pb-0.5 truncate">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { icon: 'camera', title: 'Foto', text: 'Una por lote, con la fruta completa.' },
  { icon: 'layers', title: 'Máscaras', text: 'El modelo marca cada fruta y las manchas.' },
  { icon: 'brain', title: 'Control', text: 'CLIP confirma que de verdad es fruta.' },
  { icon: 'truck-side', title: 'Destino', text: 'Vida útil y qué hacer con el lote.' },
];

interface StartPanelProps {
  recent: FruitClassification[];
  onOpen: (scan: FruitClassification) => void;
  onHistory: () => void;
}

export function StartPanel({ recent, onOpen, onHistory }: StartPanelProps) {
  return (
    <div className="space-y-5 animate-entrar">
      <section className="rounded-[28px] bg-hoja shadow-ficha p-5 sm:p-6">
        <p className="text-xs font-semibold text-tinta-3 uppercase tracking-[0.14em]">Qué vas a obtener</p>
        <h2 className="font-display text-3xl font-extrabold leading-tight mt-1">Una ficha de inspección en segundos</h2>
        <ol className="grid grid-cols-2 gap-2.5 mt-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-piedra p-4">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-anil-950 text-lima-300 flex items-center justify-center">
                  <Icon name={s.icon} size={16} />
                </span>
                <span className="font-mono text-xs text-tinta-3">0{i + 1}</span>
              </div>
              <p className="font-display font-bold mt-3">{s.title}</p>
              <p className="text-xs text-tinta-2 mt-0.5">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-3 gap-1.5 mt-5">
          {(['VERDE', 'MADURO', 'SOBREPASADO'] as const).map((st) => {
            const s = stateStyle(st);
            return (
              <div key={st} className={`rounded-2xl px-2.5 py-2.5 min-w-0 ${s.chip}`}>
                <Icon name={s.icon} size={14} />
                <p className="text-xs font-bold mt-1.5">{s.label}</p>
                <p className="text-[11px] leading-tight mt-0.5">{s.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="rounded-[28px] bg-hoja shadow-ficha p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-lg">Últimos lotes</h3>
            <button onClick={onHistory} className="text-sm font-semibold text-anil-700 hover:text-anil-600 flex items-center gap-1">
              Ver todo <Icon name="angle-small-right" size={16} />
            </button>
          </div>
          <ul className="space-y-1.5">
            {recent.map((r) => {
              const s = stateStyle(r.state);
              return (
                <li key={r.id}>
                  <button onClick={() => onOpen(r)} className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-piedra transition-colors text-left">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.chip}`}>
                      <Icon name={fruitIcon(r.fruitType)} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold truncate">{r.fruitType} {s.label.toLowerCase()}</span>
                      <span className="block font-mono text-[11px] text-tinta-3 truncate">{r.lotId} · {r.timestamp}</span>
                    </span>
                    <span className="font-mono text-xs text-tinta-2">{r.imperfectionPercentage.toFixed(1)} %</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
