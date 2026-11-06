import { useCallback, useEffect, useRef, useState } from 'react';
import type { FruitClassification, NoFruitResponse, PredictResponse, Sample, SamplesFile, ScanFailure } from './types';
import { DEFAULT_API_URL, analyzeImage, formatTimestamp, toClassification } from './services/api';
import { prepareFile, prepareUrl, thumbnailDataUrl, type PreparedImage } from './services/image';
import { loadHistory, saveHistory } from './services/history';
import { useBackend } from './lib/useBackend';
import { TabBar, TopBar, type Tab } from './components/TopBar';
import { EmptyVisor, ElapsedCounter, PhotoFrame } from './components/Visor';
import { CameraSheet } from './components/CameraSheet';
import { MaskViewer } from './components/MaskViewer';
import { ResultReport } from './components/ResultReport';
import { DecisionPanel } from './components/DecisionPanel';
import { FailureNotice, NoFruitNotice } from './components/Notices';
import { HistoryView } from './components/HistoryView';
import { SystemView } from './components/SystemView';
import { LabelSheet } from './components/LabelSheet';
import { LotField, SampleStrip, StartPanel } from './components/StartPanel';
import { Icon } from './components/Icon';

const API_KEY = 'sacred_fruit_api_url';

type Phase =
  | { name: 'vacio' }
  | { name: 'lista'; image: PreparedImage; sample?: Sample }
  | { name: 'analizando'; image: PreparedImage; sample?: Sample }
  | { name: 'resultado'; result: FruitClassification; src: string; savedAt?: string }
  | { name: 'sin_fruta'; image: PreparedImage; response: NoFruitResponse; sample?: Sample }
  | { name: 'error'; image: PreparedImage; failure: ScanFailure; sample?: Sample };

const randomLot = () => `LOTE-${Math.floor(1000 + Math.random() * 9000)}`;
const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

function readApiUrl(): string {
  try {
    return localStorage.getItem(API_KEY) || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('analizar');
  const [apiUrl, setApiUrl] = useState(readApiUrl);
  const [lotId, setLotId] = useState(randomLot);
  const [phase, setPhase] = useState<Phase>({ name: 'vacio' });
  const [history, setHistory] = useState<FruitClassification[]>(loadHistory);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [samplesDate, setSamplesDate] = useState<string>();
  const [camera, setCamera] = useState(false);
  const [label, setLabel] = useState<FruitClassification | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const { status, health, refresh } = useBackend(apiUrl);

  const galleryRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveHistory(history), [history]);

  useEffect(() => {
    fetch('/muestras/muestras.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SamplesFile | null) => {
        if (!data) return;
        setSamples(data.samples);
        setSamplesDate(data.generated_at);
      })
      .catch(() => setSamples([]));
  }, []);

  const showStage = () =>
    setTimeout(() => {
      if (!window.matchMedia('(min-width: 1024px)').matches) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);

  const analyze = useCallback(
    async (image: PreparedImage, sample?: Sample) => {
      setPhase({ name: 'analizando', image, sample });
      showStage();
      const outcome = await analyzeImage(image.upload, image.name, lotId.trim(), apiUrl);
      if (outcome.kind === 'ok') {
        const thumb = image.previewUrl ? await thumbnailDataUrl(image.previewUrl) : '';
        const result = toClassification(outcome.response, thumb, lotId.trim() || 'SIN-LOTE');
        setHistory((prev) => [result, ...prev.filter((h) => h.id !== result.id)]);
        setPhase({ name: 'resultado', result, src: image.previewUrl || thumb });
      } else if (outcome.kind === 'sin_fruta') {
        setPhase({ name: 'sin_fruta', image, response: outcome.response, sample });
      } else {
        setPhase({ name: 'error', image, failure: outcome.failure, sample });
      }
      refresh();
      showStage();
    },
    [apiUrl, lotId, refresh]
  );

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setPickError(null);
    setCamera(false);
    setTab('analizar');
    const image = await prepareFile(file);
    setPhase({ name: 'lista', image });
    showStage();
  };

  const pickSample = async (sample: Sample) => {
    setPickError(null);
    let image: PreparedImage;
    try {
      image = await prepareUrl(sample.file, `${sample.id}.jpg`);
    } catch {
      const offline = !navigator.onLine;
      setPhase({
        name: 'error',
        image: { previewUrl: sample.file, upload: new Blob(), name: sample.id },
        sample,
        failure: {
          kind: offline ? 'sin_internet' : 'servidor_caido',
          title: offline ? 'Sin conexión' : 'El servidor no responde',
          message: 'No se pudo cargar la foto de prueba desde el servidor de la app.',
          hint: 'Podés ver el resultado que el modelo dio con esta muestra cuando se generó.',
        },
      });
      return;
    }
    await analyze(image, sample);
  };

  const retry = (image: PreparedImage, sample?: Sample) => (sample && image.upload.size === 0 ? pickSample(sample) : analyze(image, sample));

  const showSaved = (sample: Sample, image: PreparedImage) => {
    if (sample.status === 200) {
      const result = toClassification(sample.result as PredictResponse, sample.file, lotId.trim() || 'MUESTRA', 'guardado');
      if (samplesDate) result.timestamp = formatTimestamp(new Date(samplesDate));
      setPhase({ name: 'resultado', result, src: image.previewUrl || sample.file, savedAt: samplesDate });
    } else {
      setPhase({ name: 'sin_fruta', image, response: sample.result as NoFruitResponse, sample });
    }
  };

  const openCamera = () => {
    if (coarsePointer() || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) nativeCameraRef.current?.click();
    else setCamera(true);
  };

  const reset = () => {
    setPhase({ name: 'vacio' });
    setPickError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openScan = (scan: FruitClassification) => {
    setPhase({ name: 'resultado', result: scan, src: scan.imageUrl });
    setTab('analizar');
    window.scrollTo({ top: 0 });
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const saveApiUrl = (url: string) => {
    setApiUrl(url);
    try {
      localStorage.setItem(API_KEY, url);
    } catch {
      /* el navegador no deja guardar: se usa solo en esta sesión */
    }
  };

  const busy = phase.name === 'analizando';
  const currentImage = 'image' in phase ? phase.image : null;
  const currentSample = 'sample' in phase ? phase.sample : undefined;

  const stage = () => {
    switch (phase.name) {
      case 'vacio':
        return <EmptyVisor onCamera={openCamera} onGallery={() => galleryRef.current?.click()} onDropFile={pickFile} />;
      case 'lista':
        return (
          <PhotoFrame src={phase.image.previewUrl}>
            <button onClick={reset} aria-label="Descartar foto" className="absolute top-3 right-3 w-11 h-11 rounded-full bg-anil-950/80 hover:bg-anil-950 text-hoja flex items-center justify-center">
              <Icon name="cross-small" size={22} />
            </button>
          </PhotoFrame>
        );
      case 'analizando':
        return <PhotoFrame src={phase.image.previewUrl} scanning />;
      case 'resultado':
        return (
          <MaskViewer
            key={phase.result.id}
            src={phase.src}
            detections={phase.result.detections ?? []}
            badge={phase.result.source === 'guardado' ? 'Resultado guardado' : undefined}
          />
        );
      default:
        return <PhotoFrame src={phase.image.previewUrl} dim />;
    }
  };

  const decision =
    phase.name === 'resultado' ? (
      <DecisionPanel
        verification={phase.result.verification}
        discarded={phase.result.discarded}
        composition={phase.result.composition}
        elapsedMs={phase.result.elapsedMs}
        found
      />
    ) : phase.name === 'sin_fruta' ? (
      <DecisionPanel verification={phase.response.verification} discarded={phase.response.debug?.discarded} elapsedMs={phase.response.elapsed_ms} found={false} />
    ) : null;

  return (
    <div className="min-h-dvh flex flex-col text-tinta">
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />

      <TopBar tab={tab} status={status} historyCount={history.length} onTab={changeTab} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8 pb-32 lg:pb-14">
        {status === 'sin_internet' && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-3xl bg-sol-100 text-sol-900 px-4 py-3.5 text-sm">
            <Icon name="wifi-slash" size={18} className="mt-0.5" />
            <p><b>Sin internet.</b> El historial y las fotos de prueba siguen disponibles; para analizar hace falta llegar al servidor.</p>
          </div>
        )}

        {tab === 'analizar' && (
          <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-7 lg:items-start">
            <div className={`space-y-4 ${decision ? '' : 'lg:sticky lg:top-24'}`}>
              {phase.name !== 'resultado' && <LotField value={lotId} onChange={setLotId} />}
              <div ref={stageRef} className="scroll-mt-20">{stage()}</div>

              {phase.name === 'lista' && (
                <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:static z-20 grid grid-cols-[1fr_auto] gap-2.5">
                  <button onClick={() => analyze(phase.image)} className="min-h-15 rounded-2xl bg-lima-400 hover:bg-lima-300 text-anil-950 font-extrabold text-lg flex items-center justify-center gap-2.5 shadow-flota transition-colors">
                    <Icon name="search-alt" size={20} />
                    Analizar lote
                  </button>
                  <button onClick={() => galleryRef.current?.click()} className="min-h-15 px-5 rounded-2xl bg-anil-950 hover:bg-anil-800 text-hoja font-bold shadow-flota transition-colors">
                    Cambiar
                  </button>
                </div>
              )}

              {busy && (
                <div role="status" aria-live="polite" className="rounded-3xl bg-anil-950 text-hoja px-5 py-4 flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full border-[3px] border-anil-700 border-t-lima-400 animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold">Analizando el lote</p>
                    <p className="text-xs text-anil-300">Segmentación, filtros y verificación con CLIP en el servidor</p>
                  </div>
                  <ElapsedCounter />
                </div>
              )}

              {pickError && <p role="alert" className="rounded-2xl bg-frambuesa-100 text-frambuesa-900 px-4 py-3 text-sm font-semibold">{pickError}</p>}

              {decision && <div className="hidden lg:block">{decision}</div>}

              {(phase.name === 'vacio' || phase.name === 'lista') && (
                <SampleStrip samples={samples} selected={currentSample?.id} disabled={busy} onPick={pickSample} />
              )}
            </div>

            <div className="mt-5 lg:mt-0 space-y-5">
              {(phase.name === 'vacio' || phase.name === 'lista') && (
                <StartPanel recent={history.slice(0, 4)} onOpen={openScan} onHistory={() => changeTab('historial')} />
              )}
              {busy && (
                <div className="rounded-[28px] bg-hoja shadow-ficha p-5 space-y-3" aria-hidden="true">
                  {[60, 90, 75, 40].map((w, i) => (
                    <div key={i} className="h-5 rounded-full bg-piedra-2 animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
              {phase.name === 'resultado' && (
                <>
                  <ResultReport result={phase.result} savedAt={phase.savedAt} onLabel={() => setLabel(phase.result)} onNew={reset} />
                  <div className="lg:hidden">{decision}</div>
                </>
              )}
              {phase.name === 'sin_fruta' && (
                <>
                  <NoFruitNotice response={phase.response} onRetry={reset} />
                  <div className="lg:hidden">{decision}</div>
                </>
              )}
              {phase.name === 'error' && currentImage && (
                <FailureNotice
                  failure={phase.failure}
                  onRetry={() => retry(currentImage, currentSample)}
                  onOther={reset}
                  onSaved={
                    currentSample && ['servidor_caido', 'sin_internet', 'tiempo_agotado'].includes(phase.failure.kind)
                      ? () => showSaved(currentSample, currentImage)
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        )}

        {tab === 'historial' && <HistoryView history={history} onOpen={openScan} onClear={() => setHistory([])} />}

        {tab === 'sistema' && (
          <SystemView apiUrl={apiUrl} status={status} health={health} samples={samples} onSaveUrl={saveApiUrl} onRefresh={refresh} />
        )}
      </main>

      <footer className="hidden lg:block py-5 px-8 text-xs text-tinta-3">
        <div className="max-w-7xl mx-auto flex justify-between">
          <span>Sacred Fruit · Proyecto 14, Inteligencia Artificial, UCI 2026</span>
          <a href="https://www.flaticon.es/uicons" target="_blank" rel="noreferrer" className="hover:text-tinta">Íconos: Uicons de Flaticon</a>
        </div>
      </footer>

      <TabBar tab={tab} historyCount={history.length} onTab={changeTab} />

      {camera && <CameraSheet onCapture={pickFile} onClose={() => setCamera(false)} onFallback={() => { setCamera(false); nativeCameraRef.current?.click(); }} />}
      {label && <LabelSheet result={label} onClose={() => setLabel(null)} />}
    </div>
  );
}
