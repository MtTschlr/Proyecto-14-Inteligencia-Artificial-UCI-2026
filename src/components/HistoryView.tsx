import { useMemo, useState } from 'react';
import type { FruitClassification, FruitQualityState } from '../types';
import { STATE_ORDER, STATE_STYLE, fruitIcon, stateStyle } from '../lib/states';
import { exportToExcel } from '../services/history';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

const PAGE = 8;

interface HistoryViewProps {
  history: FruitClassification[];
  onOpen: (scan: FruitClassification) => void;
  onClear: () => void;
}

export function HistoryView({ history, onOpen, onClear }: HistoryViewProps) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<FruitQualityState | 'TODOS'>('TODOS');
  const [fruitFilter, setFruitFilter] = useState('TODAS');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fruits = useMemo(() => Array.from(new Set(history.map((h) => h.fruitType))).sort(), [history]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter(
      (h) =>
        (stateFilter === 'TODOS' || h.state === stateFilter) &&
        (fruitFilter === 'TODAS' || h.fruitType === fruitFilter) &&
        (!q || h.lotId.toLowerCase().includes(q))
    );
  }, [history, query, stateFilter, fruitFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE, current * PAGE);
  const counts = STATE_ORDER.map((s) => history.filter((h) => h.state === s).length);
  const avgImperfection = history.length ? history.reduce((a, h) => a + h.imperfectionPercentage, 0) / history.length : 0;

  const runExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportToExcel(filtered.length ? filtered : history);
    } catch {
      setExportError('No se pudo generar el Excel. Probá de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const chip = (active: boolean, tone = 'bg-anil-950 text-hoja') =>
    `shrink-0 h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-sm font-semibold transition-colors ${active ? tone : 'bg-hoja text-tinta-2 hover:bg-piedra-2'}`;

  return (
    <section className="animate-entrar">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-tinta-3 uppercase tracking-[0.14em]">Guardado en este dispositivo</p>
          <h2 className="font-display text-4xl font-extrabold leading-none mt-1">Historial</h2>
        </div>
        {history.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={runExport}
              disabled={exporting}
              className="flex-1 sm:flex-initial min-h-12 px-5 rounded-2xl bg-anil-700 hover:bg-anil-600 text-hoja font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <Icon name="file-excel" size={18} />
              {exporting ? 'Generando…' : `Exportar ${filtered.length !== history.length ? filtered.length : 'todo'} a Excel`}
            </button>
            <button
              onClick={() => setConfirm(true)}
              aria-label="Vaciar historial"
              className="w-12 h-12 rounded-2xl bg-frambuesa-100 hover:bg-frambuesa-500/25 text-frambuesa-900 flex items-center justify-center transition-colors"
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        )}
      </div>
      {exportError && <p role="alert" className="mb-4 rounded-2xl bg-frambuesa-100 text-frambuesa-900 px-4 py-3 text-sm font-semibold">{exportError}</p>}

      {history.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-5">
          <div className="col-span-2 rounded-3xl bg-anil-950 text-hoja p-4 rayado">
            <p className="text-xs text-anil-300 font-semibold">Lotes inspeccionados</p>
            <p className="font-mono text-4xl font-semibold mt-1 tabular">{history.length}</p>
            <p className="text-xs text-anil-300 mt-1">Imperfección media {avgImperfection.toFixed(1)} %</p>
          </div>
          {STATE_ORDER.map((s, i) => (
            <div key={s} className={`rounded-3xl p-4 ${STATE_STYLE[s].chip} ${i === 2 ? 'col-span-2 lg:col-span-1' : ''}`}>
              <p className="text-xs font-semibold flex items-center gap-1.5"><Icon name={STATE_STYLE[s].icon} size={13} />{STATE_STYLE[s].label}</p>
              <p className="font-mono text-3xl font-semibold mt-1 tabular">{counts[i]}</p>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <label className="flex items-center gap-2.5 min-h-12 px-4 rounded-2xl bg-hoja shadow-ficha">
            <Icon name="search-alt" size={16} className="text-tinta-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por número de lote"
              className="w-full bg-transparent font-mono text-base uppercase placeholder:normal-case placeholder:font-sans placeholder:text-tinta-3 focus:outline-none"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto sin-barra -mx-4 px-4 sm:mx-0 sm:px-0">
            <button onClick={() => { setStateFilter('TODOS'); setPage(1); }} className={chip(stateFilter === 'TODOS')}>Todos</button>
            {STATE_ORDER.map((s) => (
              <button key={s} aria-pressed={stateFilter === s} onClick={() => { setStateFilter(s); setPage(1); }} className={chip(stateFilter === s, STATE_STYLE[s].chip)}>
                <Icon name={STATE_STYLE[s].icon} size={14} />
                {STATE_STYLE[s].label}
              </button>
            ))}
            {fruits.length > 1 && <span aria-hidden="true" className="shrink-0 w-px bg-piedra-3 mx-1" />}
            {fruits.length > 1 &&
              ['TODAS', ...fruits].map((f) => (
                <button key={f} aria-pressed={fruitFilter === f} onClick={() => { setFruitFilter(f); setPage(1); }} className={chip(fruitFilter === f)}>
                  {f === 'TODAS' ? 'Todas las frutas' : f}
                </button>
              ))}
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="rounded-[28px] bg-hoja shadow-ficha px-6 py-14 text-center">
          <span className="mx-auto w-16 h-16 rounded-3xl bg-anil-100 text-anil-700 flex items-center justify-center">
            <Icon name="apple-crate" size={28} />
          </span>
          <h3 className="font-display text-2xl font-extrabold mt-4">Todavía no hay lotes</h3>
          <p className="text-sm text-tinta-2 mt-1 max-w-xs mx-auto">Cada inspección que termine bien queda guardada acá, aunque cierres la app.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[28px] bg-hoja shadow-ficha px-6 py-12 text-center">
          <h3 className="font-display text-xl font-extrabold">Ningún lote coincide</h3>
          <button onClick={() => { setQuery(''); setStateFilter('TODOS'); setFruitFilter('TODAS'); }} className="mt-4 min-h-11 px-4 rounded-2xl bg-piedra-2 hover:bg-piedra-3 font-semibold text-sm">
            Quitar filtros
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {shown.map((item) => {
            const st = stateStyle(item.state);
            return (
              <li key={item.id}>
                <button onClick={() => onOpen(item)} className="w-full text-left flex items-center gap-3.5 p-2.5 pr-4 rounded-3xl bg-hoja shadow-ficha hover:bg-piedra-2/60 transition-colors">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-18 h-18 object-cover rounded-2xl bg-anil-950 shrink-0" />
                  ) : (
                    <span className="w-18 h-18 rounded-2xl bg-anil-950 text-anil-300 flex items-center justify-center shrink-0">
                      <Icon name={fruitIcon(item.fruitType)} size={26} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-tinta-3 truncate">{item.lotId} · {item.timestamp}</p>
                    <p className="font-display text-xl font-extrabold leading-tight truncate">{item.fruitType}</p>
                    <p className="text-xs text-tinta-2 truncate">
                      <span className="font-mono">{item.imperfectionPercentage.toFixed(1)} %</span> daño · {item.shelfLifeDays}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${st.chip}`}>
                    <Icon name={st.icon} size={12} />
                    {st.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-2 mt-5">
          <button disabled={current === 1} onClick={() => setPage(current - 1)} className="min-h-11 px-4 rounded-2xl bg-hoja hover:bg-piedra-2 disabled:opacity-40 font-semibold text-sm flex items-center gap-1">
            <Icon name="angle-small-left" size={18} /> Anterior
          </button>
          <span className="font-mono text-sm">{current} / {pages}</span>
          <button disabled={current === pages} onClick={() => setPage(current + 1)} className="min-h-11 px-4 rounded-2xl bg-hoja hover:bg-piedra-2 disabled:opacity-40 font-semibold text-sm flex items-center gap-1">
            Siguiente <Icon name="angle-small-right" size={18} />
          </button>
        </nav>
      )}

      {confirm && (
        <Sheet onClose={() => setConfirm(false)} labelledBy="vaciar-titulo">
          <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <span className="w-12 h-12 rounded-2xl bg-frambuesa-100 text-frambuesa-900 flex items-center justify-center">
              <Icon name="trash" size={20} />
            </span>
            <h3 id="vaciar-titulo" className="font-display text-2xl font-extrabold mt-4">¿Vaciar el historial?</h3>
            <p className="text-sm text-tinta-2 mt-1">Se borran los {history.length} lotes guardados en este dispositivo. No se puede deshacer.</p>
            <div className="grid grid-cols-2 gap-2.5 mt-6">
              <button onClick={() => setConfirm(false)} className="min-h-12 rounded-2xl bg-piedra-2 hover:bg-piedra-3 font-bold">Cancelar</button>
              <button onClick={() => { onClear(); setConfirm(false); setPage(1); }} className="min-h-12 rounded-2xl bg-frambuesa-500 hover:bg-frambuesa-900 text-hoja font-bold">Sí, borrar</button>
            </div>
          </div>
        </Sheet>
      )}
    </section>
  );
}
