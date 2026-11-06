import type {
  FruitClassification,
  HealthInfo,
  ModelInfo,
  NoFruitResponse,
  PredictResponse,
  ScanFailure,
} from '../types';

export const DEFAULT_API_URL = '/api';
const REQUEST_TIMEOUT_MS = 45000;

export type AnalyzeOutcome =
  | { kind: 'ok'; response: PredictResponse }
  | { kind: 'sin_fruta'; response: NoFruitResponse }
  | { kind: 'error'; failure: ScanFailure };

const cleanUrl = (apiUrl: string) => (apiUrl.trim() || DEFAULT_API_URL).replace(/\/+$/, '');

function failure(kind: ScanFailure['kind'], title: string, message: string, hint?: string): AnalyzeOutcome {
  return { kind: 'error', failure: { kind, title, message, hint } };
}

function unreachable(apiUrl: string): AnalyzeOutcome {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return failure('sin_internet', 'Sin conexión', 'El teléfono no tiene internet y no llega al servidor.', 'Conectate a una red y volvé a intentar.');
  }
  return failure(
    'servidor_caido',
    'El servidor no responde',
    'La foto no llegó al modelo.',
    `Revisá que el backend esté encendido y que la dirección en Sistema sea la correcta (${apiUrl}).`
  );
}

export async function analyzeImage(upload: Blob, name: string, lotId: string, apiUrl: string): Promise<AnalyzeOutcome> {
  const base = cleanUrl(apiUrl);
  const form = new FormData();
  form.append('file', upload, name);
  form.append('lot_id', lotId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/predict?debug=true`, { method: 'POST', body: form, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return failure('tiempo_agotado', 'Tardó demasiado', 'El servidor no contestó en 45 segundos.', 'Volvé a intentar. Si sigue pasando, reiniciá el backend.');
    }
    return unreachable(base);
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (res.ok && body?.fruit_type) return { kind: 'ok', response: body as PredictResponse };
  if (res.status === 422 && (body?.code === 'sin_fruta' || typeof body?.detail === 'string')) {
    return { kind: 'sin_fruta', response: body as NoFruitResponse };
  }
  const detail: string | undefined = typeof body?.detail === 'string' ? body.detail : undefined;
  const hint: string | undefined = body?.hint ?? undefined;
  if (res.status === 415) return failure('no_es_imagen', 'Ese archivo no es una foto', detail ?? 'El archivo no es una imagen.', hint ?? 'Elegí una foto JPG, PNG o WEBP.');
  if (res.status === 413) return failure('muy_grande', 'La foto es demasiado grande', detail ?? 'El archivo supera el tamaño máximo.', hint);
  if (res.status === 400) return failure('imagen_corrupta', 'No se pudo abrir la foto', detail ?? 'La imagen está dañada.', hint ?? 'Probá con otra foto.');
  if ([502, 503, 504].includes(res.status) || (!body && res.status >= 500)) return unreachable(base);
  return failure('error_servidor', 'El servidor tuvo un problema', detail ?? `Respondió con el código ${res.status}.`, 'Mirá la consola del backend para ver el detalle.');
}

async function getJson<T>(url: string, timeout = 6000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchHealth = (apiUrl: string) => getJson<HealthInfo>(`${cleanUrl(apiUrl)}/health`);
export const fetchModelInfo = (apiUrl: string) => getJson<ModelInfo>(`${cleanUrl(apiUrl)}/model/info`);

export function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toClassification(
  data: PredictResponse,
  imageUrl: string,
  lotId: string,
  source: FruitClassification['source'] = 'modelo'
): FruitClassification {
  return {
    id: source === 'modelo' ? data.id : `${data.id}-${Date.now()}`,
    timestamp: formatTimestamp(new Date()),
    lotId: data.lot_id || lotId,
    fruitType: data.fruit_type,
    state: data.state,
    imperfectionPercentage: data.imperfection_percentage ?? 0,
    imperfectionDetails: data.imperfection_details,
    shelfLifeDays: data.shelf_life_days,
    suggestedAction: data.suggested_action,
    confidence: data.confidence ?? 0,
    imageUrl,
    caliber: data.caliber,
    estimatedWeight: data.estimated_weight,
    detections: Array.isArray(data.detections) ? data.detections : [],
    composition: data.composition,
    verification: data.verification,
    discarded: data.debug?.discarded,
    quality: data.quality,
    elapsedMs: data.elapsed_ms,
    source,
  };
}
