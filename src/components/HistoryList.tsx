import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import type { FruitClassification, FruitQualityState } from '../types';
import {
  HistoryIcon,
  DownloadIcon,
  TrashIcon,
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  CloseIcon,
  BasketIcon,
  FilterIcon,
} from './CustomIcons';
import { StateBadge } from './StateBadge';
import { Sheet } from './Sheet';
import { STATE_ORDER, STATE_STYLE } from '../lib/stateStyle';

interface HistoryListProps {
  history: FruitClassification[];
  onSelectScan: (scan: FruitClassification) => void;
  onClearHistory: () => void;
}

const ITEMS_PER_PAGE = 6;

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onSelectScan,
  onClearHistory,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<FruitQualityState | 'TODOS'>('TODOS');
  const [fruitFilter, setFruitFilter] = useState<string>('TODAS');

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

  const hasFilters = query.trim() !== '' || stateFilter !== 'TODOS' || fruitFilter !== 'TODAS';

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);

  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const displayedHistory = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const clearFilters = () => {
    setQuery('');
    setStateFilter('TODOS');
    setFruitFilter('TODAS');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    if (history.length === 0) return;

    const dataForExcel = history.map((item) => ({
      'ID Registro': item.id,
      'Hora': item.timestamp,
      'Nº de Lote': item.lotId,
      'Fruta / Variedad': item.fruitType,
      'Estado': item.state,
      'Confianza IA (%)': Math.round(item.confidence * 100),
      'Imperfección (%)': item.imperfectionPercentage,
      'Detalle Imperfección': item.imperfectionDetails,
      'Vida Útil Estimada': item.shelfLifeDays,
      'Calibre': item.caliber,
      'Peso Estimado': item.estimatedWeight,
      'Recomendación Logística': item.suggestedAction,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);

    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 40 },
      { wch: 22 },
      { wch: 28 },
      { wch: 22 },
      { wch: 46 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Calidad');

    XLSX.writeFile(workbook, `SacredFruit_Reporte_Calidad_${Date.now()}.xlsx`);
  };

  const handleConfirmClear = () => {
    onClearHistory();
    setShowConfirmModal(false);
    setCurrentPage(1);
    clearFilters();
  };

  const chipClass = (active: boolean, activeStyle = 'bg-hoja-800 text-papel-claro') =>
    `shrink-0 min-h-11 inline-flex items-center gap-2 px-3.5 rounded-full text-sm font-medium transition-colors ${
      active ? activeStyle : 'bg-papel-hondo text-tinta-suave hover:bg-linea-suave'
    }`;

  return (
    <section id="history-section" className="scroll-mt-20 animate-aparecer">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-hoja-800 text-papel-claro flex items-center justify-center">
            <HistoryIcon size={22} />
          </span>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-hoja-900 leading-tight">Historial</h2>
            <p className="text-sm text-tinta-suave">
              {history.length === 0
                ? 'Todavía no hay capturas'
                : filtered.length === 0
                  ? 'Ninguna captura coincide con el filtro'
                  : `Mostrando ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} de ${filtered.length} capturas`}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial min-h-11 bg-hoja-800 text-papel-claro hover:bg-hoja-700 active:bg-hoja-950 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              title="Descargar reporte en formato Excel (.xlsx)"
            >
              <DownloadIcon size={18} />
              Exportar a Excel
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              aria-label="Vaciar historial"
              className="w-11 h-11 text-terracota-700 bg-terracota-100 hover:bg-terracota-300/60 active:bg-terracota-300 rounded-xl flex items-center justify-center transition-colors"
              title="Borrar historial local"
            >
              <TrashIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mb-4 space-y-2.5">
          <label className="flex items-center gap-2.5 min-h-12 px-3.5 rounded-xl bg-papel-hondo">
            <SearchIcon size={18} className="text-tinta-tenue" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por número de lote"
              aria-label="Buscar por número de lote"
              className="w-full bg-transparent font-mono text-base uppercase placeholder:normal-case placeholder:font-sans placeholder:text-tinta-tenue focus:outline-none"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto sin-barra -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por estado">
            <button onClick={() => { setStateFilter('TODOS'); setCurrentPage(1); }} className={chipClass(stateFilter === 'TODOS')}>
              <FilterIcon size={15} />
              Todos los estados
            </button>
            {STATE_ORDER.map((s) => {
              const info = STATE_STYLE[s];
              const count = history.filter((h) => h.state === s).length;
              return (
                <button
                  key={s}
                  onClick={() => { setStateFilter(s); setCurrentPage(1); }}
                  aria-pressed={stateFilter === s}
                  className={chipClass(stateFilter === s, `${info.soft} font-semibold`)}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${info.dot}`} />
                  {info.label}
                  <span className="font-mono text-xs opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {fruits.length > 1 && (
            <div className="flex gap-2 overflow-x-auto sin-barra -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por fruta">
              <button onClick={() => { setFruitFilter('TODAS'); setCurrentPage(1); }} className={chipClass(fruitFilter === 'TODAS')}>
                <BasketIcon size={15} />
                Todas las frutas
              </button>
              {fruits.map((f) => (
                <button
                  key={f}
                  onClick={() => { setFruitFilter(f); setCurrentPage(1); }}
                  aria-pressed={fruitFilter === f}
                  className={chipClass(fruitFilter === f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <div className="flex flex-col items-center text-center rounded-2xl bg-papel-hondo/60 px-6 py-14">
          <div className="relative w-24 h-24 mb-5">
            <span className="absolute inset-0 rounded-full bg-salvia-100" />
            <span className="absolute inset-3 rounded-full bg-salvia-200" />
            <span className="absolute inset-0 flex items-center justify-center text-hoja-700">
              <BasketIcon size={38} />
            </span>
          </div>
          <h3 className="font-serif text-xl font-semibold text-hoja-900 mb-1">El cajón está vacío</h3>
          <p className="text-sm text-tinta-suave max-w-xs">
            Cada lote que analices se guarda aquí, en este dispositivo, para consultarlo o exportarlo después.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center text-center rounded-2xl bg-papel-hondo/60 px-6 py-12">
          <span className="w-16 h-16 rounded-full bg-salvia-100 text-hoja-700 flex items-center justify-center mb-4">
            <SearchIcon size={28} />
          </span>
          <h3 className="font-serif text-xl font-semibold text-hoja-900 mb-1">Sin resultados</h3>
          <p className="text-sm text-tinta-suave mb-4">Prueba con otro lote o quita algún filtro.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="min-h-11 px-4 rounded-xl bg-salvia-100 text-hoja-800 font-semibold text-sm hover:bg-salvia-200">
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {displayedHistory.map((item) => {
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelectScan(item)}
                  className="w-full text-left flex items-center gap-3.5 p-2.5 pr-3 rounded-xl bg-papel-claro shadow-hoja hover:bg-papel-hondo/60 active:bg-papel-hondo transition-colors"
                >
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg bg-hoja-950 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-tinta">{item.lotId}</span>
                      <span className="font-mono text-[11px] text-tinta-tenue">{item.timestamp}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-hoja-900 leading-tight truncate">{item.fruitType}</h3>
                    <p className="text-xs text-tinta-suave truncate">
                      <span className="font-mono">{item.imperfectionPercentage.toFixed(1)}%</span> de imperfección · {item.shelfLifeDays}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StateBadge state={item.state} />
                    <ChevronRightIcon size={18} className="text-tinta-tenue" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-between gap-2 mt-5">
          <button
            disabled={validCurrentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="min-h-11 pl-2.5 pr-4 rounded-xl bg-papel-hondo disabled:opacity-40 font-medium text-sm hover:bg-papel-hondo transition-colors flex items-center gap-1"
          >
            <ChevronLeftIcon size={20} />
            Anterior
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto sin-barra py-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                aria-current={pageNum === validCurrentPage ? 'page' : undefined}
                className={`w-11 h-11 rounded-xl font-mono text-sm font-semibold transition-colors ${
                  pageNum === validCurrentPage
                    ? 'bg-hoja-800 text-papel-claro'
                    : 'text-tinta-suave hover:bg-papel-hondo'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            disabled={validCurrentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="min-h-11 pl-4 pr-2.5 rounded-xl bg-papel-hondo disabled:opacity-40 font-medium text-sm hover:bg-papel-hondo transition-colors flex items-center gap-1"
          >
            Siguiente
            <ChevronRightIcon size={20} />
          </button>
        </nav>
      )}

      {showConfirmModal && (
        <Sheet onClose={() => setShowConfirmModal(false)} labelledBy="clear-title">
          <div className="p-5 sm:p-6 pb-seguro">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-12 h-12 rounded-xl bg-terracota-100 text-terracota-700 flex items-center justify-center shrink-0">
                <AlertIcon size={24} />
              </span>
              <div className="flex-1">
                <h3 id="clear-title" className="font-serif text-xl font-semibold text-hoja-900">Vaciar historial</h3>
                <p className="text-sm text-tinta-suave mt-1">
                  Se van a eliminar las {history.length} capturas guardadas en este dispositivo. Esta acción no se puede deshacer.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                aria-label="Cerrar"
                className="w-10 h-10 -mt-1 -mr-1 flex items-center justify-center rounded-full text-tinta-suave hover:bg-papel-hondo"
              >
                <CloseIcon size={22} />
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 min-h-12 bg-papel-hondo text-tinta hover:bg-linea-suave rounded-xl font-semibold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClear}
                className="flex-1 min-h-12 bg-terracota-500 text-white hover:bg-terracota-700 active:bg-terracota-900 rounded-xl font-semibold text-sm transition-colors"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </section>
  );
};
