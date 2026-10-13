export type FruitQualityState = 'VERDE' | 'MADURO' | 'SOBREPASADO';

export type FruitKey = 'banana' | 'mango' | 'naranja' | 'tomate';

export type DetectionKind = 'fruta' | 'defecto';

export interface Detection {
  kind: DetectionKind;
  label: string;
  confidence: number;
  box: [number, number, number, number];
  polygon?: [number, number][];
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
  source?: 'modelo' | 'demo';
}

export interface BackendConfig {
  apiUrl: string;
  useMock: boolean;
  isOnline: boolean;
}

export interface SampleFruitPreset {
  name: string;
  fruit: FruitKey;
  state: FruitQualityState;
  imperfection: number;
  imageUrl: string;
}
