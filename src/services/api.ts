import type {
  BackendConfig,
  Detection,
  FruitClassification,
  FruitKey,
  FruitQualityState,
  SampleFruitPreset,
} from '../types';
import {
  DEFECT_CLASS,
  FRUIT_NAMES,
  FRUIT_RULES,
  describeImperfection,
  modelClassName,
  suggestAction,
} from './fruitRules';

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  apiUrl: '/api',
  useMock: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const unsplash = (id: string, w = 600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
const sample = (name: string, fruit: FruitKey, state: FruitQualityState, imperfection: number, id: string): SampleFruitPreset => ({
  name,
  fruit,
  state,
  imperfection,
  imageUrl: unsplash(id),
  thumbUrl: unsplash(id, 240),
});

// Muestras rápidas: cada foto lleva su resultado de demo para que coincida con lo que se ve.
export const SAMPLE_PHOTOS: SampleFruitPreset[] = [
  sample('Banana en racimo', 'banana', 'MADURO', 3.2, 'photo-1571771894821-ce9b6c11b08e'),
  sample('Mango amarillo', 'mango', 'MADURO', 4.6, 'photo-1553279768-865429fa0078'),
  sample('Mango surtido', 'mango', 'VERDE', 2.1, 'photo-1601493700631-2b16ec4b4716'),
  sample('Naranja', 'naranja', 'MADURO', 2.6, 'photo-1547514701-42782101795e'),
  sample('Tomate en rama', 'tomate', 'MADURO', 1.8, 'photo-1546094096-0df4bcaaa337'),
];

export class ScanError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'ScanError';
    this.hint = hint;
  }
}

const REQUEST_TIMEOUT_MS = 30000;
const UPLOAD_MAX_SIDE = 1280;

export function compressImageForStorage(dataUrl: string, maxWidth = 600, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
          return;
        }
      } catch (err) {
        console.warn('Image compression fallback:', err);
      }
      resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blob(cx: number, cy: number, r: number, rand: () => number): [number, number][] {
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const rr = r * (0.75 + rand() * 0.5);
    return [Number((cx + Math.cos(angle) * rr).toFixed(4)), Number((cy + Math.sin(angle) * rr * 0.9).toFixed(4))];
  });
}

// Geometría simulada: una fruta elíptica y zonas dañadas cuya área suma el % de imperfección.
function buildDemoDetections(
  label: string,
  confidence: number,
  imperfection: number,
  zones: number,
  seed: string
): Detection[] {
  const rand = seededRandom(seed);
  const cx = 0.5;
  const cy = 0.52;
  const rx = 0.34;
  const ry = 0.3;
  const fruitPolygon: [number, number][] = Array.from({ length: 32 }, (_, i) => {
    const angle = (i / 32) * Math.PI * 2;
    return [Number((cx + Math.cos(angle) * rx).toFixed(4)), Number((cy + Math.sin(angle) * ry).toFixed(4))];
  });
  const detections: Detection[] = [
    {
      kind: 'fruta',
      label,
      confidence,
      box: [cx - rx, cy - ry, cx + rx, cy + ry],
      polygon: fruitPolygon,
    },
  ];
  if (zones === 0) return detections;

  const r = Math.sqrt((imperfection / 100) * rx * ry) / Math.sqrt(zones);
  for (let i = 0; i < zones; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 0.25 + rand() * 0.5;
    const zx = cx + Math.cos(angle) * rx * dist;
    const zy = cy + Math.sin(angle) * ry * dist;
    detections.push({
      kind: 'defecto',
      label: DEFECT_CLASS,
      confidence: Number((0.55 + rand() * 0.3).toFixed(2)),
      box: [zx - r, zy - r, zx + r, zy + r],
      polygon: blob(zx, zy, r, rand),
    });
  }
  return detections;
}

function buildDemoResult(
  fruit: FruitKey,
  state: FruitQualityState,
  imperfection: number,
  lotId: string,
  imageUrl: string
): FruitClassification {
  const rules = FRUIT_RULES[fruit];
  const id = `SCAN-${Date.now()}`;
  const zones = imperfection < 1 ? 0 : imperfection < 5 ? 2 : imperfection < 12 ? 3 : 4;
  const confidence = Number((0.88 + Math.random() * 0.11).toFixed(2));

  return {
    id,
    timestamp: formatTimestamp(new Date()),
    lotId,
    fruitType: FRUIT_NAMES[fruit],
    state,
    imperfectionPercentage: imperfection,
    imperfectionDetails: describeImperfection(zones, imperfection),
    shelfLifeDays: rules.shelfLife[state],
    suggestedAction: suggestAction(state, imperfection),
    confidence,
    imageUrl,
    caliber: rules.caliber,
    estimatedWeight: rules.weight,
    detections: buildDemoDetections(modelClassName(fruit, state), confidence, imperfection, zones, `${id}-${lotId}`),
    source: 'demo',
  };
}

async function imageToUploadBlob(src: string): Promise<Blob> {
  const resized = await compressImageForStorage(src, UPLOAD_MAX_SIDE, 0.9);
  if (resized.startsWith('data:image')) return (await fetch(resized)).blob();
  return (await fetch(src)).blob();
}

export async function classifyFruitImage(
  imageBlobOrUrl: string,
  lotId: string,
  config: BackendConfig
): Promise<FruitClassification> {
  const finalLotId = lotId.trim() || `LOTE-${Math.floor(100000 + Math.random() * 900000)}`;
  const storedImageUrl = await compressImageForStorage(imageBlobOrUrl);

  if (config.useMock) {
    const sample = SAMPLE_PHOTOS.find((s) => s.imageUrl === imageBlobOrUrl);
    if (!sample) {
      throw new ScanError(
        'En modo demo solo se pueden analizar las muestras de prueba.',
        'Desactivá el modo demo en Ajustes para analizar tus fotos con el modelo.'
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return buildDemoResult(sample.fruit, sample.state, sample.imperfection, finalLotId, storedImageUrl);
  }

  const apiUrl = (config.apiUrl || '/api').replace(/\/$/, '');
  let res: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const formData = new FormData();
    formData.append('file', await imageToUploadBlob(imageBlobOrUrl), 'capture.jpg');
    formData.append('lot_id', finalLotId);
    res = await fetch(`${apiUrl}/predict`, { method: 'POST', body: formData, signal: controller.signal });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'AbortError';
    throw new ScanError(
      timedOut ? 'El servidor del modelo tardó demasiado en responder.' : 'No se pudo conectar con el servidor del modelo.',
      `Revisá que el backend esté encendido y que la dirección en Ajustes sea correcta (${apiUrl}).`
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 422 || res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new ScanError(
      body?.detail || 'No se detectó ninguna fruta en la imagen.',
      'Acercate a la fruta, que se vea completa y con buena luz, sin fondos del mismo color.'
    );
  }
  if (!res.ok) {
    throw new ScanError(`El servidor respondió con un error (HTTP ${res.status}).`, 'Mirá la consola del backend para ver el detalle.');
  }

  const data = await res.json();
  return {
    id: data.id || `SCAN-${Date.now()}`,
    timestamp: formatTimestamp(new Date()),
    lotId: data.lot_id || finalLotId,
    fruitType: data.fruit_type,
    state: data.state,
    imperfectionPercentage: data.imperfection_percentage ?? 0,
    imperfectionDetails: data.imperfection_details || 'Análisis del modelo completado',
    shelfLifeDays: data.shelf_life_days || '—',
    suggestedAction: data.suggested_action || '—',
    confidence: data.confidence ?? 0,
    imageUrl: storedImageUrl,
    caliber: data.caliber || '—',
    estimatedWeight: data.estimated_weight || '—',
    detections: Array.isArray(data.detections) ? data.detections : [],
    source: 'modelo',
  };
}
