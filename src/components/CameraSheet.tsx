import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

interface CameraSheetProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}

export function CameraSheet({ onCapture, onClose, onFallback }: CameraSheetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      stop();
      setReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setError(null);
      } catch (err) {
        const denied = err instanceof DOMException && err.name === 'NotAllowedError';
        setError(denied ? 'No hay permiso para usar la cámara.' : 'No se pudo abrir la cámara en el navegador.');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stop();
      onCapture(new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fundido select-none">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedData={() => setReady(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
        <div className="relative w-[78vmin] h-[78vmin] max-w-md max-h-md">
          {['top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl'].map((c) => (
            <span key={c} className={`absolute w-12 h-12 border-lima-400 ${c}`} />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-linear-to-b from-black/75 to-transparent">
        <button onClick={onClose} aria-label="Cerrar cámara" className="w-12 h-12 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center">
          <Icon name="cross-small" size={24} />
        </button>
        <p className="text-sm text-white/90 font-semibold text-center">Que la fruta entre completa en el recuadro</p>
        <button
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          aria-label="Cambiar de cámara"
          className="w-12 h-12 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center"
        >
          <Icon name="rotate-right" size={20} />
        </button>
      </div>

      {error && (
        <div role="alert" className="relative z-10 mx-5 mt-auto mb-auto p-5 rounded-3xl bg-anil-950/95 text-center">
          <p className="text-hoja font-semibold">{error}</p>
          <p className="text-anil-300 text-sm mt-1">Podés usar la cámara del teléfono o elegir una foto guardada.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
            <button onClick={onFallback} className="min-h-12 px-5 rounded-2xl bg-lima-400 hover:bg-lima-300 text-anil-950 font-bold">
              Usar la cámara del teléfono
            </button>
            <button onClick={onClose} className="min-h-12 px-5 rounded-2xl bg-anil-800 hover:bg-anil-700 text-hoja font-bold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-center pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))] bg-linear-to-t from-black/80 to-transparent">
        <button
          onClick={shoot}
          disabled={!ready || !!error}
          aria-label="Sacar la foto"
          className="w-20 h-20 rounded-full border-4 border-white p-1.5 disabled:opacity-40"
        >
          <span className="block w-full h-full rounded-full bg-white active:bg-lima-400 transition-colors" />
        </button>
      </div>
    </div>
  );
}
