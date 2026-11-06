import { useState, type ReactNode } from 'react';
import type { CompositionItem, DiscardedItem, Verification } from '../types';
import { REASON_TEXT, prettyLabel } from '../lib/states';
import { Icon } from './Icon';

interface DecisionPanelProps {
  verification?: Verification;
  discarded?: DiscardedItem[];
  composition?: CompositionItem[];
  elapsedMs?: number;
  found: boolean;
}

function Step({ n, title, icon, children, last = false }: { n: number; title: string; icon: string; children: ReactNode; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[2.25rem_1fr] gap-3">
      {!last && <span aria-hidden="true" className="absolute left-[1.06rem] top-10 bottom-0 w-0.5 bg-piedra-3" />}
      <span className="w-9 h-9 rounded-full bg-anil-950 text-lima-300 flex items-center justify-center font-mono text-xs font-semibold z-10">{n}</span>
      <div className="pb-5 min-w-0">
        <h4 className="font-display font-bold flex items-center gap-2">
          <Icon name={icon} size={15} className="text-anil-600" />
          {title}
        </h4>
        <div className="text-sm text-tinta-2 mt-1 space-y-1">{children}</div>
      </div>
    </li>
  );
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

export function DecisionPanel({ verification, discarded = [], composition = [], elapsedMs, found }: DecisionPanelProps) {
  const [open, setOpen] = useState(false);
  if (!verification) return null;
  const tried = verification.models_tried ?? (verification.model ? [verification.model] : []);
  const usedFallback = found && tried.length > 1;
  const reasons = Object.entries(verification.discarded_by ?? {});
  const clip = verification.clip;
  const colors = verification.color_corrections ?? [];

  return (
    <section className="rounded-[28px] bg-hoja shadow-ficha p-5 sm:p-6 animate-entrar">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-tinta-3 uppercase tracking-[0.14em]">Trazabilidad</p>
          <h3 className="font-display text-2xl font-extrabold leading-tight">Cómo se decidió</h3>
        </div>
        {elapsedMs !== undefined && (
          <span className="shrink-0 rounded-full bg-piedra-2 px-3 py-1.5 font-mono text-xs font-semibold flex items-center gap-1.5">
            <Icon name="stopwatch" size={13} />
            {elapsedMs} ms
          </span>
        )}
      </div>

      <ol>
        <Step n={1} title="Detección y segmentación" icon="layers">
          {tried.length === 0 && <p>Sin datos del modelo.</p>}
          {tried.length === 1 && <p>Respondió el modelo principal <code className="font-mono text-xs">{tried[0]}</code> (YOLO11s-seg).</p>}
          {tried.length > 1 && (
            <p>
              <code className="font-mono text-xs">{tried[0]}</code> no dejó ninguna fruta en pie, así que se probó con el respaldo{' '}
              <code className="font-mono text-xs">{tried[1]}</code>
              {usedFallback ? ', que fue el que respondió.' : ', que tampoco encontró.'}
            </p>
          )}
        </Step>

        <Step n={2} title="Filtros" icon="filter">
          {reasons.length === 0 ? (
            <p>No hizo falta descartar ninguna detección.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {reasons.map(([reason, count]) => (
                <li key={reason} className="rounded-full bg-piedra-2 px-2.5 py-1 text-xs font-semibold">
                  {REASON_TEXT[reason] ?? reason}: {count}
                </li>
              ))}
            </ul>
          )}
          {colors.map((c) => (
            <p key={`${c.from}-${c.red_ratio}`}>
              Una «{prettyLabel(c.from)}» con {pct(c.red_ratio)} de color rojo se corrigió a {prettyLabel(c.to)}.
            </p>
          ))}
        </Step>

        <Step n={3} title="Verificación con CLIP" icon="brain">
          {!clip?.enabled ? (
            <p>CLIP no está activo. El servidor usa umbrales de confianza más altos para compensar.</p>
          ) : (
            <>
              <p>
                Revisó {clip.checked} recorte{clip.checked === 1 ? '' : 's'} en {clip.ms} ms.
                {clip.rejected.length === 0 && clip.corrections.length === 0 && ' Todo coincidió con lo que vio el modelo.'}
              </p>
              {clip.rejected.map((r, i) => (
                <p key={`r${i}`} className="flex items-start gap-2">
                  <Icon name="cross-circle" size={14} className="mt-1 text-frambuesa-500" />
                  <span>Descartó «{prettyLabel(r.label)}»: parecía {r.winner} ({pct(r.score)}).</span>
                </p>
              ))}
              {clip.corrections.map((c, i) => (
                <p key={`c${i}`} className="flex items-start gap-2">
                  <Icon name="shuffle" size={14} className="mt-1 text-anil-600" />
                  <span>Corrigió «{prettyLabel(c.from)}» a «{prettyLabel(c.to)}» ({pct(c.score)} de seguridad).</span>
                </p>
              ))}
            </>
          )}
        </Step>

        <Step n={4} title="Resultado" icon="list-check" last>
          {found && composition.length > 0 ? (
            <p>
              Ganó «{prettyLabel(composition[0].label)}», con {pct(composition[0].share)} de la superficie de fruta
              {composition[0].detections > 1 ? ` en ${composition[0].detections} detecciones` : ''}.
            </p>
          ) : found ? (
            <p>Ganó la clase con más superficie detectada.</p>
          ) : (
            <p>Después de los filtros no quedó ninguna fruta, así que no se emite veredicto.</p>
          )}
        </Step>
      </ol>

      {discarded.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="w-full min-h-11 rounded-2xl bg-piedra hover:bg-piedra-2 px-4 flex items-center justify-between text-sm font-semibold transition-colors"
          >
            <span>{discarded.length === 1 ? "Ver la detección descartada" : `Ver las ${discarded.length} detecciones descartadas`}</span>
            <Icon name={open ? 'angle-small-up' : 'angle-small-down'} size={18} />
          </button>
          {open && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-tinta-3 text-left">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Clase</th>
                    <th className="py-2 pr-3 font-semibold">Conf.</th>
                    <th className="py-2 pr-3 font-semibold">Motivo</th>
                    <th className="py-2 font-semibold">Modelo</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {discarded.map((d, i) => (
                    <tr key={i} className={i % 2 ? '' : 'bg-piedra/60'}>
                      <td className="py-1.5 pr-3 pl-1 whitespace-nowrap">{prettyLabel(d.label)}</td>
                      <td className="py-1.5 pr-3">{d.confidence.toFixed(2)}</td>
                      <td className="py-1.5 pr-3 font-sans">{REASON_TEXT[d.reason] ?? d.reason}{d.winner ? ` (${d.winner})` : ''}</td>
                      <td className="py-1.5">{d.model ?? 'principal'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
