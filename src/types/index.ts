export type FruitQualityState = 'VERDE' | 'MADURO' | 'SOBREPASADO';

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
}

export interface BackendConfig {
  apiUrl: string;
  useMock: boolean;
  isOnline: boolean;
}

export interface SampleFruitPreset {
  name: string;
  state: FruitQualityState;
  imperfection: number;
  details: string;
  shelfLife: string;
  action: string;
  caliber: string;
  imageUrl: string;
}
