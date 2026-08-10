import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CaptureArea } from './components/CaptureArea';
import { ResultSection } from './components/ResultSection';
import { HistoryList } from './components/HistoryList';
import { LabelModal } from './components/LabelModal';
import type { FruitClassification, BackendConfig } from './types';
import { classifyFruitImage, DEFAULT_BACKEND_CONFIG } from './services/api';

const LOCAL_STORAGE_HISTORY_KEY = 'sacred_fruit_history_v1';
const LOCAL_STORAGE_CONFIG_KEY = 'sacred_fruit_config_v1';

export function App() {
  const [config, setConfig] = useState<BackendConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_BACKEND_CONFIG;
    } catch {
      return DEFAULT_BACKEND_CONFIG;
    }
  });

  const [lotId, setLotId] = useState<string>(() => `LOTE-${Math.floor(1000 + Math.random() * 9000)}`);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<FruitClassification | null>(null);
  const [resetCaptureSignal, setResetCaptureSignal] = useState<number>(0);

  const [history, setHistory] = useState<FruitClassification[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeLabelResult, setActiveLabelResult] = useState<FruitClassification | null>(null);

  useEffect(() => {
    const handleOnline = () => setConfig((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setConfig((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.warn('LocalStorage quota limit warning:', err);
      try {
        const pruned = history.slice(0, 10).map((item) => ({
          ...item,
          imageUrl: item.imageUrl.length > 50000 ? '' : item.imageUrl,
        }));
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(pruned));
      } catch {
        // Ignorar falla de almacenamiento secundario
      }
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Ignorar
    }
  }, [config]);

  const handleCapture = async (imageDataUrl: string, batchLotId: string) => {
    setIsProcessing(true);

    // Scroll inmediato hacia la zona de resultados para mostrar el spinner de procesamiento
    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    try {
      const classification = await classifyFruitImage(imageDataUrl, batchLotId, config);
      setCurrentResult(classification);
      setHistory((prev) => [classification, ...prev]);
      setResetCaptureSignal((prev) => prev + 1);

      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewCapture = () => {
    setCurrentResult(null);
    setResetCaptureSignal((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectScan = (selectedScan: FruitClassification) => {
    setCurrentResult(selectedScan);
    setResetCaptureSignal((prev) => prev + 1);

    // Render diferido para asegurar que el DOM de result-section esté renderizado antes de hacer scroll
    setTimeout(() => {
      const element = document.getElementById('result-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setResetCaptureSignal((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-black antialiased selection:bg-black selection:text-emerald-300">
      {!config.isOnline && (
        <div className="bg-red-600 text-white font-medium text-xs px-4 py-2 text-center border-b-2 border-black">
          Modo Offline activado (PWA Caché) • Los resultados se guardarán localmente
        </div>
      )}

      <Header historyCount={history.length} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        <CaptureArea
          onCapture={handleCapture}
          isProcessing={isProcessing}
          currentLotId={lotId}
          onChangeLotId={setLotId}
          resetSignal={resetCaptureSignal}
        />

        <ResultSection
          result={currentResult}
          isProcessing={isProcessing}
          onGenerateLabel={(resultToPrint) => setActiveLabelResult(resultToPrint)}
          onNewCapture={handleNewCapture}
        />

        <HistoryList
          history={history}
          onSelectScan={handleSelectScan}
          onClearHistory={handleClearHistory}
        />
      </main>

      {activeLabelResult && (
        <LabelModal
          result={activeLabelResult}
          onClose={() => setActiveLabelResult(null)}
        />
      )}

      <footer className="w-full bg-slate-950 text-white border-t-2 border-slate-800 py-4 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium">
          <p>© 2026 Sacred Fruit PWA • Control de calidad y clasificación</p>
          <p className="text-slate-300">Impresión térmica de etiquetas integrada</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
