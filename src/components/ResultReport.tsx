import type { FruitClassification } from '../types';
import { STATE_ORDER, STATE_STYLE, fruitIcon, imperfectionLevel, parseShelfLife, prettyLabel, stateStyle } from '../lib/states';
import { Icon } from './Icon';
import { QualityWarnings } from './Notices';

const LEVEL_TONE = {
  Leve: 'bg-verde-100 text-verde-900',
  Moderada: 'bg-sol-100 text-sol-900',
  Elevada: 'bg-frambuesa-100 text-frambuesa-900',
} as const;

function MaturityChart({ state }: { state: FruitClassification['state'] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="img" aria-label={`Estado de madurez: ${STATE_STYLE[state].label}`}>
      {STATE_ORDER.map((s) => {
        const info = STATE_STYLE[s];
        const active = s === state;
        return (
          <div key={s} className={`rounded-2xl px-3 py-3 transition-colors ${active ? `${info.fill} text-anil-950` : 'bg-piedra-2 text-tinta-3'}`}>
            <Icon name={info.icon} size={18} className={active && s === 'SOBREPASADO' ? 'text-hoja' : ''} />
            <p className={`font-display font-bold text-[13px] sm:text-sm mt-2 ${active && s === 'SOBREPASADO' ? 'text-hoja' : ''}`}>{info.label}</p>
            <p className={`text-[11px] leading-tight ${active ? (s === 'SOBREPASADO' ? 'text-hoja/85' : 'text-anil-950/75') : ''}`}>{info.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

function Gauge({ percentage }: { percentage: number }) {
  const width = Math.min(100, (percentage / 20) * 100);
  return (
    <div>
      <div className="relative h-3.5 rounded-full bg-piedra-2 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-frambuesa-500" style={{ width: `${Math.max(width, percentage > 0 ? 2 : 0)}%` }} />
        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-hoja" style={{ left: '25%' }} />
        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-hoja" style={{ left: '60%' }} />
      </div>
      <div className="relative h-4 mt-1 font-mono text-[10px] text-tinta-3">
        <span className="absolute left-0">0 %</span>
        <span className="absolute -translate-x-1/2" style={{ left: '25%' }}>5</span>
        <span className="absolute -translate-x-1/2" style={{ left: '60%' }}>12</span>
        <span className="absolute right-0">20+</span>
      </div>
    </div>
  );
}

function ShelfCalendar({ text, color }: { text: string; color: string }) {
  const { min, max } = parseShelfLife(text);
  const cells = Math.min(Math.max(max + 2, 7), 16);
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }} role="img" aria-label={`Vida útil: ${text}`}>
        {Array.from({ length: cells }, (_, i) => {
          const day = i + 1;
          const sure = day <= min;
          const maybe = !sure && day <= max;
          return (
            <span
              key={day}
              className="h-8 rounded-md flex items-end justify-center pb-0.5 font-mono text-[9px]"
              style={{
                backgroundColor: sure ? color : maybe ? 'transparent' : 'var(--color-piedra-2)',
                backgroundImage: maybe ? `repeating-linear-gradient(135deg, ${color} 0 3px, transparent 3px 6px)` : undefined,
                color: sure ? 'var(--color-anil-950)' : 'var(--color-tinta-3)',
              }}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-tinta-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} /> días seguros</span>
        {max > min && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 4px)` }} />
            depende del manejo
          </span>
        )}
      </div>
    </div>
  );
}

interface ResultReportProps {
  result: FruitClassification;
  savedAt?: string;
  onLabel: () => void;
  onNew: () => void;
}

export function ResultReport({ result, savedAt, onLabel, onNew }: ResultReportProps) {
  const style = stateStyle(result.state);
  const level = imperfectionLevel(result.imperfectionPercentage);
  const zones = (result.detections ?? []).filter((d) => d.kind === 'defecto').length;
  const fruits = (result.detections ?? []).filter((d) => d.kind === 'fruta').length;
  const composition = result.composition ?? [];
  const otherFruits = new Set(composition.map((c) => c.fruit)).size > 1;

  return (
    <article className="rounded-[28px] bg-hoja shadow-ficha overflow-hidden animate-entrar">
      {result.source === 'guardado' && (
        <div className="flex items-start gap-3 px-5 py-3.5 bg-sol-100 text-sol-900 text-sm">
          <Icon name="time-past" size={18} className="mt-0.5" />
          <p>
            <b>Resultado guardado.</b> El servidor no responde, así que se muestra lo que el modelo dio con esta misma muestra
            {savedAt ? ` el ${new Date(savedAt).toLocaleDateString('es-AR')}` : ''}. No se analizó ahora.
          </p>
        </div>
      )}

      <header className="px-5 sm:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-tinta-3">
          <span className="truncate">{result.lotId} · {result.timestamp}</span>
          {result.elapsedMs !== undefined && <span className="shrink-0">{(result.elapsedMs / 1000).toFixed(2)} s</span>}
        </div>
        <div className="flex items-end justify-between gap-4 mt-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-tinta-3 uppercase tracking-[0.14em] mb-1">Veredicto</p>
            <h2 className="font-display text-[2.6rem] sm:text-5xl font-extrabold leading-[0.95] tracking-tight flex items-center gap-3">
              <Icon name={fruitIcon(result.fruitType)} size={34} className="text-anil-700" />
              {result.fruitType}
            </h2>
            <span className={`inline-flex items-center gap-2 mt-3 rounded-full px-3.5 py-1.5 text-sm font-bold ${style.chip}`}>
              <Icon name={style.icon} size={15} />
              {style.label}
              <span className="hidden sm:inline font-normal opacity-80">· {style.hint}</span>
            </span>
          </div>
          <div className="shrink-0 w-24 h-24 rounded-full flex flex-col items-center justify-center text-anil-950" style={{ background: `conic-gradient(var(--color-anil-700) ${result.confidence * 360}deg, var(--color-piedra-2) 0)` }}>
            <div className="w-[76px] h-[76px] rounded-full bg-hoja flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-semibold tabular">{Math.round(result.confidence * 100)}%</span>
              <span className="text-[10px] text-tinta-3 leading-none">confianza</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 sm:px-6 pb-5 space-y-6">
        <QualityWarnings issues={result.quality?.issues ?? []} />

        {composition.length > 1 && (
          <section className="rounded-2xl bg-anil-100 p-4">
            <h3 className="font-display font-bold text-anil-900 flex items-center gap-2">
              <Icon name="apple-crate" size={16} />
              {otherFruits ? 'Hay más de una fruta en la foto' : 'El lote no es parejo'}
            </h3>
            <p className="text-sm text-tinta-2 mt-1">
              El veredicto toma la clase que más superficie ocupa. Así se reparte el resto:
            </p>
            <ul className="mt-3 space-y-2">
              {composition.map((c) => (
                <li key={c.label} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm">
                  <span className="truncate font-semibold capitalize">{prettyLabel(c.label)}</span>
                  <span className="h-2.5 rounded-full bg-hoja overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${c.share * 100}%`, backgroundColor: stateStyle(c.state).color }} />
                  </span>
                  <span className="font-mono text-xs text-right tabular">{Math.round(c.share * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="font-display font-bold text-lg mb-2.5">Carta de madurez</h3>
          <MaturityChart state={result.state} />
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-piedra p-4">
            <p className="text-xs text-tinta-3 font-semibold">Imperfección</p>
            <p className="font-mono text-3xl font-semibold mt-1 tabular">{result.imperfectionPercentage.toFixed(1)}<span className="text-lg text-tinta-3"> %</span></p>
            <span className={`inline-block mt-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_TONE[level]}`}>{level}</span>
          </div>
          <div className="rounded-2xl bg-piedra p-4">
            <p className="text-xs text-tinta-3 font-semibold">Detecciones</p>
            <p className="font-mono text-3xl font-semibold mt-1 tabular">{fruits}<span className="text-lg text-tinta-3"> fruta{fruits === 1 ? '' : 's'}</span></p>
            <p className="text-xs text-tinta-2 mt-2">{zones === 0 ? 'Sin zonas dañadas' : `${zones} zona${zones === 1 ? '' : 's'} dañada${zones === 1 ? '' : 's'}`}</p>
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-x-2 gap-y-0.5 mb-2">
            <h3 className="font-display font-bold text-lg">Superficie dañada</h3>
            <span className="text-xs text-tinta-3">{result.imperfectionDetails}</span>
          </div>
          <Gauge percentage={result.imperfectionPercentage} />
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-2 mb-2.5">
            <h3 className="font-display font-bold text-lg">Vida útil estimada</h3>
            <span className="font-mono text-sm font-semibold">{result.shelfLifeDays}</span>
          </div>
          <ShelfCalendar text={result.shelfLifeDays} color={style.color} />
        </section>

        <section className="rounded-2xl bg-anil-950 text-hoja p-5 rayado">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lima-300 flex items-center gap-2">
            <Icon name="truck-side" size={15} />
            Qué hacer con el lote
          </p>
          <p className="font-display text-xl sm:text-2xl font-bold mt-2 leading-snug">{result.suggestedAction}</p>
          <dl className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-sm">
            <div>
              <dt className="text-anil-300 text-xs">Calibre</dt>
              <dd className="font-semibold">{result.caliber}</dd>
            </div>
            <div>
              <dt className="text-anil-300 text-xs">Embalaje</dt>
              <dd className="font-semibold">{result.estimatedWeight}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-anil-300 mt-3">Calibre, embalaje, vida útil y recomendación salen de reglas fijas por fruta y estado.</p>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={onLabel} className="min-h-13 rounded-2xl bg-anil-700 hover:bg-anil-600 text-hoja font-bold flex items-center justify-center gap-2 transition-colors">
            <Icon name="print" size={18} />
            Etiqueta
          </button>
          <button onClick={onNew} className="min-h-13 rounded-2xl bg-lima-400 hover:bg-lima-300 text-anil-950 font-bold flex items-center justify-center gap-2 transition-colors">
            <Icon name="camera" size={18} />
            Otro lote
          </button>
        </div>
      </div>
    </article>
  );
}
