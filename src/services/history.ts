import type { FruitClassification } from '../types';

const HISTORY_KEY = 'sacred_fruit_history_v1';
const MAX_ITEMS = 120;

export function loadHistory(): FruitClassification[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((h) => h && h.id && h.fruitType && h.state) : [];
  } catch {
    return [];
  }
}

// Si el almacenamiento se llena, primero se sacan las fotos de los registros más viejos y después los registros.
export function saveHistory(history: FruitClassification[]): void {
  let items = history.slice(0, MAX_ITEMS);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
      return;
    } catch {
      const keepPhotos = Math.max(0, Math.floor(items.length / (attempt + 2)));
      items = items.map((item, i) => (i < keepPhotos ? item : { ...item, imageUrl: '', detections: [], discarded: undefined }));
      if (attempt >= 3) items = items.slice(0, Math.ceil(items.length / 2));
    }
  }
}

export async function exportToExcel(history: FruitClassification[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = history.map((item) => ({
    'ID registro': item.id,
    'Fecha y hora': item.timestamp,
    Lote: item.lotId,
    Fruta: item.fruitType,
    Estado: item.state,
    'Confianza (%)': Math.round(item.confidence * 100),
    'Imperfección (%)': item.imperfectionPercentage,
    'Zonas dañadas': item.detections ? item.detections.filter((d) => d.kind === 'defecto').length : '',
    'Detalle de imperfección': item.imperfectionDetails,
    'Vida útil': item.shelfLifeDays,
    Calibre: item.caliber,
    'Peso estimado': item.estimatedWeight,
    'Recomendación logística': item.suggestedAction,
    'Clases en la foto': (item.composition ?? []).map((c) => `${c.label} ${Math.round(c.share * 100)}%`).join(', '),
    Modelo: item.verification?.model ?? '',
    'Tiempo (ms)': item.elapsedMs ?? '',
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [18, 17, 13, 10, 13, 13, 15, 13, 40, 14, 28, 20, 46, 34, 12, 11].map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Inspecciones');
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  XLSX.writeFile(book, `SacredFruit_inspecciones_${stamp}.xlsx`);
}
