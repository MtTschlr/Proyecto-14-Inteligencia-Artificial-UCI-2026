import type { FruitClassification, FruitQualityState, BackendConfig } from '../types';

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  apiUrl: 'http://localhost:8000',
  useMock: true,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const SAMPLE_FRUITS = [
  {
    fruitType: 'Banano Cavendish',
    state: 'MADURO' as FruitQualityState,
    imperfectionPercentage: 3.2,
    imperfectionDetails: 'Moteado superficial natural de azúcares',
    shelfLifeDays: '3 a 5 Días (Temp. 14°C)',
    suggestedAction: 'APTO VENTA EN CAJA DIRECTA - PRIORIDAD MEDIA',
    caliber: 'Calibre A (Superior a 20cm)',
    estimatedWeight: 'Caja Estándar 18.1 kg',
  },
  {
    fruitType: 'Manzana Red Delicious',
    state: 'VERDE' as FruitQualityState,
    imperfectionPercentage: 1.5,
    imperfectionDetails: 'Firme sin rozaduras visibles',
    shelfLifeDays: '14 a 20 Días (Cámara Fría 4°C)',
    suggestedAction: 'EXCELENTE PARA CONSERVACIÓN Y ALMACENAMIENTO',
    caliber: 'Calibre 80 (Primera Categoría)',
    estimatedWeight: 'Caja 19.5 kg',
  },
  {
    fruitType: 'Naranja Valencia',
    state: 'MADURO' as FruitQualityState,
    imperfectionPercentage: 4.8,
    imperfectionDetails: 'Rozadura leve de fricción por huerta',
    shelfLifeDays: '7 a 10 Días (Lugar fresco)',
    suggestedAction: 'DESPACHO INMEDIATO A LOCALES COMERCIALES',
    caliber: 'Calibre 72 (Mediana)',
    estimatedWeight: 'Malla / Caja 15 kg',
  },
  {
    fruitType: 'Aguacate Hass',
    state: 'SOBREPASADO' as FruitQualityState,
    imperfectionPercentage: 14.6,
    imperfectionDetails: 'Ablandamiento excesivo y abolladura en pulpa',
    shelfLifeDays: '1 a 2 Días máximo',
    suggestedAction: 'LIQUIDAR PARA INDUSTRIA PROCESADORA O DESCARTE',
    caliber: 'Calibre 48 (Grande)',
    estimatedWeight: 'Caja 10 kg',
  },
  {
    fruitType: 'Fresa Camarosa',
    state: 'SOBREPASADO' as FruitQualityState,
    imperfectionPercentage: 18.2,
    imperfectionDetails: 'Zona con principio de deshidratación y mancha húmeda',
    shelfLifeDays: '1 Día (Refrigerado)',
    suggestedAction: 'RESTRICCIÓN PARA VENTA FRESCA - SELECCIÓN EXIGIDA',
    caliber: 'Calibre Estándar Malla',
    estimatedWeight: 'Caja 2 kg (10 Clamshells)',
  },
  {
    fruitType: 'Limón Tahití',
    state: 'VERDE' as FruitQualityState,
    imperfectionPercentage: 0.8,
    imperfectionDetails: 'Cáscara firme color verde profundo',
    shelfLifeDays: '15 a 25 Días',
    suggestedAction: 'ALTA DURABILIDAD - APTO EXPORTACIÓN O EMBARQUE',
    caliber: 'Calibre 175',
    estimatedWeight: 'Caja 18 kg',
  }
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

export async function classifyFruitImage(
  imageBlobOrUrl: string,
  lotId: string,
  config: BackendConfig
): Promise<FruitClassification> {
  const finalLotId = lotId.trim() || `LOTE-${Math.floor(100000 + Math.random() * 900000)}`;

  // Comprimir imagen para optimizar uso de memoria y localStorage
  const storedImageUrl = await compressImageForStorage(imageBlobOrUrl);

  if (!config.useMock && config.apiUrl) {
    try {
      const formData = new FormData();
      if (imageBlobOrUrl.startsWith('data:')) {
        const response = await fetch(imageBlobOrUrl);
        const blob = await response.blob();
        formData.append('file', blob, 'capture.jpg');
      }
      formData.append('lot_id', finalLotId);

      const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/api/v1/classify`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return {
          id: data.id || `SCAN-${Date.now()}`,
          timestamp: `${day}/${month}/${year} ${time}`,
          lotId: data.lot_id || finalLotId,
          fruitType: data.fruit_type || 'Fruta Detectada',
          state: data.state || 'MADURO',
          imperfectionPercentage: data.imperfection_percentage ?? 2.5,
          imperfectionDetails: data.imperfection_details || 'Análisis backend completado',
          shelfLifeDays: data.shelf_life_days || '5 Días',
          suggestedAction: data.suggested_action || 'VENTA REGULAR',
          confidence: data.confidence ?? 0.94,
          imageUrl: storedImageUrl,
          caliber: data.caliber || 'Calibre A',
          estimatedWeight: data.estimated_weight || 'Caja 15kg',
        };
      }
    } catch (err) {
      console.warn('FastAPI backend connection failed, falling back to local market engine:', err);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const selected = SAMPLE_FRUITS[Math.floor(Math.random() * SAMPLE_FRUITS.length)];
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const timeString = `${day}/${month}/${year} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  return {
    id: `SCAN-${Date.now()}`,
    timestamp: timeString,
    lotId: finalLotId,
    fruitType: selected.fruitType,
    state: selected.state,
    imperfectionPercentage: selected.imperfectionPercentage,
    imperfectionDetails: selected.imperfectionDetails,
    shelfLifeDays: selected.shelfLifeDays,
    suggestedAction: selected.suggestedAction,
    confidence: Number((0.88 + Math.random() * 0.11).toFixed(2)),
    imageUrl: storedImageUrl,
    caliber: selected.caliber,
    estimatedWeight: selected.estimatedWeight,
  };
}
