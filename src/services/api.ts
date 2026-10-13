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
  apiUrl: 'http://localhost:8000',
  useMock: true,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;

// Muestras rápidas: cada foto lleva su resultado de demo para que coincida con lo que se ve.
export const SAMPLE_PHOTOS: SampleFruitPreset[] = [
  { name: 'Banana en racimo', fruit: 'banana', state: 'MADURO', imperfection: 3.2, imageUrl: unsplash('photo-1571771894821-ce9b6c11b08e') },
  { name: 'Mango amarillo', fruit: 'mango', state: 'MADURO', imperfection: 4.6, imageUrl: unsplash('photo-1553279768-865429fa0078') },
  { name: 'Mango surtido', fruit: 'mango', state: 'VERDE', imperfection: 2.1, imageUrl: unsplash('photo-1601493700631-2b16ec4b4716') },
  { name: 'Naranja', fruit: 'naranja', state: 'MADURO', imperfection: 2.6, imageUrl: unsplash('photo-1547514701-42782101795e') },
  { name: 'Tomate en rama', fruit: 'tomate', state: 'MADURO', imperfection: 1.8, imageUrl: unsplash('photo-1546094096-0df4bcaaa337') },
];

// Resultados de demo para fotos que no son muestras: cubren las frutas y estados del modelo.
const EXTRA_PRESETS: Pick<SampleFruitPreset, 'fruit' | 'state' | 'imperfection'>[] = [
  { fruit: 'banana', state: 'VERDE', imperfection: 0.9 },
  { fruit: 'banana', state: 'SOBREPASADO', imperfection: 17.4 },
  { fruit: 'mango', state: 'SOBREPASADO', imperfection: 14.6 },
  { fruit: 'naranja', state: 'VERDE', imperfection: 1.2 },
  { fruit: 'naranja', state: 'SOBREPASADO', imperfection: 9.8 },
  { fruit: 'tomate', state: 'VERDE', imperfection: 0.7 },
  { fruit: 'tomate', state: 'SOBREPASADO', imperfection: 13.1 },
];

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

export async function classifyFruitImage(
  imageBlobOrUrl: string,
  lotId: string,
  config: BackendConfig
): Promise<FruitClassification> {
  const finalLotId = lotId.trim() || `LOTE-${Math.floor(100000 + Math.random() * 900000)}`;

  // Comprimir imagen para optimizar uso de memoria y localStorage
  const storedImageUrl = await compressImageForStorage(imageBlobOrUrl);

  if (!config.useMock && config.apiUrl) {
    let res: Response | null = null;
    try {
      const formData = new FormData();
      const blob = await (await fetch(imageBlobOrUrl)).blob();
      formData.append('file', blob, 'capture.jpg');
      formData.append('lot_id', finalLotId);

      res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.warn('FastAPI backend connection failed, falling back to demo mode:', err);
    }

    if (res && res.status === 422) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'El modelo no detectó ninguna fruta en la imagen.');
    }

    if (res && res.ok) {
      const data = await res.json();
      return {
        id: data.id || `SCAN-${Date.now()}`,
        timestamp: formatTimestamp(new Date()),
        lotId: data.lot_id || finalLotId,
        fruitType: data.fruit_type || 'Fruta detectada',
        state: data.state || 'MADURO',
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
  }

  await new Promise((resolve) => setTimeout(resolve, 3200));

  const sample = SAMPLE_PHOTOS.find((s) => s.imageUrl === imageBlobOrUrl);
  const pool = [...SAMPLE_PHOTOS, ...EXTRA_PRESETS];
  const selected = sample ?? pool[Math.floor(Math.random() * pool.length)];
  return buildDemoResult(selected.fruit, selected.state, selected.imperfection, finalLotId, storedImageUrl);
}
