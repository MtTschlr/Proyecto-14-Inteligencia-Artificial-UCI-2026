import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import type { FruitClassification, FruitQualityState } from '../types';
import { HistoryIcon, DownloadIcon, TrashIcon, AlertIcon, CloseIcon } from './CustomIcons';

interface HistoryListProps {
  history: FruitClassification[];
  onSelectScan: (scan: FruitClassification) => void;
  onClearHistory: () => void;
}

function getStateBadge(state: FruitQualityState) {
  switch (state) {
    case 'VERDE':
      return 'bg-emerald-700 text-white';
    case 'MADURO':
      return 'bg-emerald-300 text-slate-950';
    case 'SOBREPASADO':
      return 'bg-red-700 text-white';
    default:
      return 'bg-slate-800 text-white';
  }
}

const ITEMS_PER_PAGE = 5;

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onSelectScan,
  onClearHistory,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);

  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const displayedHistory = history.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleExportExcel = () => {
    if (history.length === 0) return;

    const dataForExcel = history.map((item) => ({
      'ID Registro': item.id,
      'Hora': item.timestamp,
      'Nº de Lote': item.lotId,
      'Fruta / Variedad': item.fruitType,
      'Estado': item.state,
      'Imperfección (%)': item.imperfectionPercentage,
      'Detalle Imperfección': item.imperfectionDetails,
      'Vida Útil Estimada': item.shelfLifeDays,
      'Calibre': item.caliber,
      'Recomendación Logística': item.suggestedAction,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);

    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 10 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 35 },
      { wch: 22 },
      { wch: 22 },
      { wch: 38 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Calidad');

    XLSX.writeFile(workbook, `SacredFruit_Reporte_Calidad_${Date.now()}.xlsx`);
  };

  const handleConfirmClear = () => {
    onClearHistory();
    setShowConfirmModal(false);
    setCurrentPage(1);
  };

  return (
    <section className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-7 mb-6 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-white rounded-2xl">
            <HistoryIcon size={22} />
          </div>
          <div>
            <h3 className="text-xl font-brand font-black text-black">Historial reciente</h3>
            <p className="text-xs font-medium text-slate-500">
              {history.length > 0
                ? `Mostrando ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, history.length)} de ${history.length} capturas`
                : 'Sin capturas registradas'}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial bg-emerald-600 text-white border-2 border-slate-900 px-3.5 py-2 rounded-2xl font-bold text-xs hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow transition-all hover:scale-105"
              title="Descargar reporte real en formato Excel (.xlsx)"
            >
              <DownloadIcon size={16} />
              Exportar Excel (.xlsx)
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="bg-slate-100 text-red-700 border-2 border-slate-900 px-3 py-2 rounded-2xl font-bold text-xs hover:bg-red-100 flex items-center justify-center gap-1 transition-all"
              title="Borrar historial local"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">
          <p className="font-bold text-xs text-slate-600">
            No hay capturas registradas en esta sesión.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedHistory.map((item) => {
            const badgeClass = getStateBadge(item.state);
            return (
              <div
                key={item.id}
                onClick={() => onSelectScan(item)}
                className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-3.5 sm:p-4 hover:bg-emerald-50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.fruitType}
                    className="w-14 h-14 object-cover rounded-xl border-2 border-slate-900 bg-black shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5 rounded-md">
                        {item.lotId}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">{item.timestamp}</span>
                    </div>
                    <h4 className="font-brand font-black text-base text-black leading-tight">{item.fruitType}</h4>
                    <p className="text-xs text-slate-700 font-medium">
                      Imperfección: {item.imperfectionPercentage.toFixed(1)}% • Vida útil: {item.shelfLifeDays}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                  <div
                    className={`font-mono font-bold text-xs px-3 py-1.5 rounded-full border-2 border-slate-900 tracking-wider ${badgeClass}`}
                  >
                    Estado: {item.state}
                  </div>
                  <span className="text-xs font-bold text-black border-2 border-slate-900 rounded-xl px-2.5 py-1 bg-white hover:bg-black hover:text-white transition-colors">
                    Ver ›
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Numbered Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t-2 border-slate-200">
          <button
            disabled={validCurrentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-100 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            ‹ Anterior
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl font-mono font-black text-xs border-2 border-slate-900 transition-all ${
                  pageNum === validCurrentPage
                    ? 'bg-black text-white shadow'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            disabled={validCurrentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-100 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Siguiente ›
          </button>
        </div>
      )}

      {/* Styled Confirmation Modal for Clear History */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white border-3 border-black rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 bg-slate-100 text-black p-1.5 rounded-full border-2 border-black hover:bg-slate-200"
            >
              <CloseIcon size={16} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl border-2 border-red-600">
                <AlertIcon size={24} />
              </div>
              <div>
                <h4 className="text-xl font-brand font-black text-black">Vaciar historial</h4>
                <p className="text-xs font-bold text-slate-500">Confirmación de limpieza</p>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-800 mb-6">
              ¿Estás seguro de que deseas eliminar todas las capturas registradas? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-100 text-black hover:bg-slate-200 border-2 border-black py-3 rounded-2xl font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClear}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 border-2 border-black py-3 rounded-2xl font-bold text-xs transition-colors shadow-md"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
