import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, type AppTab } from './components/BottomNav';
import { CaptureArea } from './components/CaptureArea';
import { ResultSection } from './components/ResultSection';
import { HistoryList } from './components/HistoryList';
import { LabelModal } from './components/LabelModal';
import { FastApiConfigModal } from './components/FastApiConfigModal';
import { AlertIcon, CloseIcon, WifiOffIcon } from './components/CustomIcons';
import type { FruitClassification, BackendConfig } from './types';
import { classifyFruitImage, DEFAULT_BACKEND_CONFIG } from './services/api';

const LOCAL_STORAGE_HISTORY_KEY = 'sacred_fruit_history_v1';
const LOCAL_STORAGE_CONFIG_KEY = 'sacred_fruit_config_v1';

function scrollToResult(delay: number) {
  setTimeout(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, delay);
}

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
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<FruitClassification | null>(null);
  const [resetCaptureSignal, setResetCaptureSignal] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<AppTab>('escanear');
  const [showConfig, setShowConfig] = useState<boolean>(false);

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

  useEffect(() => {
    if (!scanError) return;
    const timer = setTimeout(() => setScanError(null), 8000);
    return () => clearTimeout(timer);
  }, [scanError]);

  const handleCapture = async (imageDataUrl: string, batchLotId: string) => {
    setIsProcessing(true);
    setPendingImage(imageDataUrl);
    setScanError(null);

    scrollToResult(50);

    try {
      const classification = await classifyFruitImage(imageDataUrl, batchLotId, config);
      setCurrentResult(classification);
      setHistory((prev) => [classification, ...prev]);
      setResetCaptureSignal((prev) => prev + 1);

      scrollToResult(100);
    } catch (err) {
      console.error('Inference error:', err);
      setScanError(err instanceof Error ? err.message : 'No se pudo analizar la imagen.');
    } finally {
      setIsProcessing(false);
      setPendingImage(null);
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
    setActiveTab('escanear');
    scrollToResult(100);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setResetCaptureSignal((prev) => prev + 1);
  };

  const handleNavChange = (tab: AppTab) => {
    if (tab === 'ajustes') {
      setShowConfig(true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const hasResultArea = isProcessing || currentResult !== null;

  return (
    <div className="min-h-dvh flex flex-col font-sans text-tinta antialiased">
      <Header
        historyCount={history.length}
        isOnline={config.isOnline}
        useMock={config.useMock}
        onOpenSettings={() => setShowConfig(true)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 pt-5 pb-28 lg:pt-8 lg:pb-12">
        {!config.isOnline && (
          <div
            role="status"
            className="flex items-start gap-3 mb-5 rounded-xl border border-miel-300 bg-miel-100 px-4 py-3 text-sm text-miel-900 animate-aparecer"
          >
            <WifiOffIcon size={18} className="mt-0.5" />
            <p>
              <span className="font-semibold">Sin conexión.</span> La app sigue funcionando y los resultados se guardan en este dispositivo.
            </p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8 lg:items-start">
          <div className={activeTab === 'escanear' ? 'block' : 'hidden lg:block'}>
            <CaptureArea
              onCapture={handleCapture}
              isProcessing={isProcessing}
              currentLotId={lotId}
              onChangeLotId={setLotId}
              resetSignal={resetCaptureSignal}
            />
          </div>

          <div
            className={`${activeTab === 'escanear' ? 'block' : 'hidden lg:block'} ${hasResultArea ? 'mt-5' : ''} lg:mt-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto barra-fina`}
          >
            <ResultSection
              result={currentResult}
              isProcessing={isProcessing}
              pendingImage={pendingImage}
              onGenerateLabel={(resultToPrint) => setActiveLabelResult(resultToPrint)}
              onNewCapture={handleNewCapture}
            />
          </div>
        </div>

        <div className={`${activeTab === 'historial' ? 'block' : 'hidden lg:block'} lg:mt-12`}>
          <HistoryList
            history={history}
            onSelectScan={handleSelectScan}
            onClearHistory={handleClearHistory}
          />
        </div>
      </main>

      {scanError && (
        <div
          role="alert"
          className="fixed z-40 left-4 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:left-auto lg:right-8 lg:bottom-8 lg:w-96 flex items-start gap-3 rounded-xl border border-terracota-300 bg-terracota-100 p-4 text-terracota-900 shadow-hoja-lg animate-aparecer"
        >
          <AlertIcon size={22} className="mt-0.5" />
          <p className="flex-1 text-sm font-medium">{scanError}</p>
          <button
            onClick={() => setScanError(null)}
            aria-label="Cerrar aviso"
            className="w-10 h-10 -m-2 flex items-center justify-center rounded-full hover:bg-terracota-300/50"
          >
            <CloseIcon size={20} />
          </button>
        </div>
      )}

      {activeLabelResult && (
        <LabelModal
          result={activeLabelResult}
          onClose={() => setActiveLabelResult(null)}
        />
      )}

      {showConfig && (
        <FastApiConfigModal
          config={config}
          onSave={setConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      <footer className="hidden lg:block border-t border-linea-suave py-4 px-8 text-xs text-tinta-tenue">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p>Sacred Fruit · control de calidad de frutas</p>
          <p>Iconos de Flaticon</p>
        </div>
      </footer>

      <BottomNav
        active={showConfig ? 'ajustes' : activeTab}
        historyCount={history.length}
        onChange={handleNavChange}
      />
    </div>
  );
}

export default App;
