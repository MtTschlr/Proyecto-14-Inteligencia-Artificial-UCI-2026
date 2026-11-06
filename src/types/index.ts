export type FruitQualityState = 'VERDE' | 'MADURO' | 'SOBREPASADO';
export type QualityIssue = 'oscura' | 'borrosa';
export type NoFruitReason = 'sin_deteccion' | 'no_es_fruta' | 'muy_chica' | 'forma' | 'confianza_baja';

export interface Detection {
  kind: 'fruta' | 'defecto';
  label: string;
  confidence: number;
  box: [number, number, number, number];
  polygon?: [number, number][] | null;
  polygons?: [number, number][][];
}

export interface ClipVerdict {
  label: string;
  winner: string;
  score: number;
  fruit_score: number;
}

export interface ClipCorrection extends ClipVerdict {
  from: string;
  to: string;
}

export interface ClipInfo {
  enabled: boolean;
  checked: number;
  ms: number;
  rejected: ClipVerdict[];
  corrections: Omit<ClipCorrection, 'label'>[];
}

export interface Verification {
  model?: string;
  models_tried?: string[];
  discarded: number;
  discarded_by: Record<string, number>;
  color_corrections?: { from: string; to: string; red_ratio: number }[];
  clip: ClipInfo;
}

export interface DiscardedItem {
  label: string;
  confidence: number;
  reason: 'confianza' | 'area' | 'forma' | 'clip';
  winner?: string;
  score?: number;
  model?: string;
}

export interface Quality {
  brightness: number;
  sharpness: number;
  issues: QualityIssue[];
}

export interface CompositionItem {
  label: string;
  fruit: string;
  state: FruitQualityState;
  detections: number;
  share: number;
}

export interface PredictResponse {
  id: string;
  lot_id: string | null;
  fruit_type: string;
  state: FruitQualityState;
  confidence: number;
  imperfection_percentage: number;
  imperfection_details: string;
  shelf_life_days: string;
  suggested_action: string;
  caliber: string;
  estimated_weight: string;
  detections: Detection[];
  composition?: CompositionItem[];
  verification: Verification;
  quality?: Quality;
  elapsed_ms?: number;
  debug?: { discarded: DiscardedItem[]; image_size: [number, number] };
}

export interface NoFruitResponse {
  detail: string;
  code: string;
  reason?: NoFruitReason;
  hint?: string | null;
  verification?: Verification;
  quality?: Quality;
  elapsed_ms?: number;
  debug?: { discarded: DiscardedItem[]; image_size: [number, number] };
}

export interface FruitClassification {
  id: string;
  timestamp: string;
  lotId: string;
  fruitType: string;
  state: FruitQualityState;
  imperfectionPercentage: number;
  imperfectionDetails: string;
  shelfLifeDays: string;
  suggestedAction: string;
  confidence: number;
  imageUrl: string;
  caliber: string;
  estimatedWeight: string;
  detections?: Detection[];
  composition?: CompositionItem[];
  verification?: Verification;
  discarded?: DiscardedItem[];
  quality?: Quality;
  elapsedMs?: number;
  source?: 'modelo' | 'guardado' | 'demo';
}

export type ErrorKind =
  | 'sin_internet'
  | 'servidor_caido'
  | 'tiempo_agotado'
  | 'no_es_imagen'
  | 'imagen_corrupta'
  | 'muy_grande'
  | 'error_servidor';

export interface ScanFailure {
  kind: ErrorKind;
  title: string;
  message: string;
  hint?: string;
}

export interface NoFruitOutcome {
  response: NoFruitResponse;
  imageUrl: string;
  lotId: string;
}

export type BackendStatus = 'verificando' | 'listo' | 'degradado' | 'caido' | 'sin_internet';

export interface HealthInfo {
  status: 'ok' | 'degradado';
  version: string;
  model: string;
  clip: { active: boolean; requested: boolean; error: string | null };
  fallback: { active: boolean; file: string | null };
  uptime_s: number;
}

export interface ModelInfo {
  api_version: string;
  model: { file: string; version: string | null; task: string; trained_at: string | null; epochs: number | null; classes: string[] };
  fallback: { file: string; version: string | null; trained_at: string | null; classes: string[] } | null;
  thresholds: {
    conf_by_fruit: Record<string, number>;
    defect_conf: number;
    min_area: number;
    min_cluster: number;
    max_fill: number;
    red_swap: number;
  };
  clip: { active: boolean; architecture: string; weights: string; max_crops: number; margin: number; swap: number; error: string | null };
  limits: { max_upload_mb: number; max_pixels: number; max_side: number; image_size: number };
}

export interface Sample {
  id: string;
  name: string;
  file: string;
  credit?: { title: string; url: string; author: string; license: string } | null;
  status: number;
  result: PredictResponse | NoFruitResponse;
}

export interface SamplesFile {
  generated_at: string;
  samples: Sample[];
}
