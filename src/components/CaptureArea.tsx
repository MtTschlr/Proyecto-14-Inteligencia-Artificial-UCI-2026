import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CameraIcon,
  UploadIcon,
  SwitchCameraIcon,
  CloseIcon,
  CameraOffIcon,
  AnalyzeIcon,
  ImagesIcon,
  TagIcon,
  AlertIcon,
} from './CustomIcons';
import { CornerGuides } from './CornerGuides';
import { SAMPLE_PHOTOS } from '../services/api';

const SampleThumb: React.FC<{ src: string; name: string; eager: boolean }> = ({ src, name, eager }) => {
  const [status, setStatus] = useState<'cargando' | 'lista' | 'error'>('cargando');

  return (
    <span className="relative block w-full h-full">
      {status !== 'lista' && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 bg-salvia-100 text-hoja-800 text-[11px] font-medium leading-tight text-center">
          {status === 'error' ? (
            <>
              <AlertIcon size={18} />
              Sin conexión a la foto
            </>
          ) : (
            name
          )}
        </span>
      )}
      {status !== 'error' && (
        <img
          src={src}
          alt={name}
          width={112}
          height={112}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setStatus('lista')}
          onError={() => setStatus('error')}
          className={`block w-full h-full object-cover transition-opacity duration-300 ${status === 'lista' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  );
};

interface CaptureAreaProps {
  onCapture: (imageDataUrl: string, lotId: string) => void;
  isProcessing: boolean;
  currentLotId: string;
  onChangeLotId: (newLotId: string) => void;
  resetSignal?: number;
}

export const CaptureArea: React.FC<CaptureAreaProps> = ({
  onCapture,
  isProcessing,
  currentLotId,
  onChangeLotId,
  resetSignal,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lotInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (resetSignal) {
      setPreviewImage(null);
    }
  }, [resetSignal]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((err) => console.warn('Play error:', err));
      }
    } catch (primaryErr) {
      console.warn('Primary camera access error, trying fallback:', primaryErr);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch((err) => console.warn('Fallback play error:', err));
        }
      } catch (fallbackErr) {
        console.warn('Fallback camera access error:', fallbackErr);
        setCameraError(
          'No se pudo acceder a la cámara WebRTC. Puedes usar la cámara nativa de tu teléfono.'
        );
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraOpen, startCamera, stopCamera]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleOpenCameraModal = () => {
    setCameraError(null);
    setIsCameraOpen(true);
  };

  const handleCloseCameraModal = () => {
    stopCamera();
    setIsCameraOpen(false);
  };

  const handleTakeSnapshot = () => {
    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setPreviewImage(dataUrl);
        handleCloseCameraModal();
        return;
      }
    }
    nativeCameraInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        if (result) {
          setPreviewImage(result);
          setIsCameraOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setPreviewImage(sampleUrl);
  };

  const handleResetPreview = () => {
    setPreviewImage(null);
  };

  const handleLotFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const segmentClass = (active: boolean) =>
    `flex-1 min-h-11 flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
      active ? 'bg-hoja-800 text-papel-claro shadow-sm' : 'text-tinta-suave hover:bg-papel-claro/70'
    }`;

  return (
    <section className="bg-papel-claro border border-linea rounded-2xl shadow-hoja p-4 sm:p-6 animate-aparecer">
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="font-mono text-[11px] text-tinta-tenue mb-0.5">Paso 1 de 2</p>
          <h2 className="font-serif text-2xl font-semibold text-hoja-900 leading-tight">Escanear un lote</h2>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div role="tablist" aria-label="Origen de la foto" className="flex gap-1 p-1 rounded-xl bg-papel-hondo sm:w-72 shrink-0">
          <button role="tab" aria-selected={mode === 'camera'} onClick={() => setMode('camera')} className={segmentClass(mode === 'camera')}>
            <CameraIcon size={18} />
            Cámara
          </button>
          <button
            role="tab"
            aria-selected={mode === 'upload'}
            onClick={() => {
              setMode('upload');
              setIsCameraOpen(false);
            }}
            className={segmentClass(mode === 'upload')}
          >
            <UploadIcon size={18} />
            Subir foto
          </button>
        </div>

        <label
          htmlFor="lot-input"
          className="flex-1 min-h-14 flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg border border-dashed border-tinta-tenue/50 bg-miel-100/60 cursor-text"
        >
          <span aria-hidden="true" className="w-3 h-3 rounded-full bg-papel border border-tinta-tenue/60 shrink-0" />
          <span className="flex items-center gap-1.5 text-xs text-tinta-suave font-medium shrink-0">
            <TagIcon size={14} />
            Lote
          </span>
          <input
            id="lot-input"
            ref={lotInputRef}
            type="text"
            value={currentLotId}
            onFocus={handleLotFocus}
            onChange={(e) => onChangeLotId(e.target.value)}
            placeholder="LOTE-001"
            autoCapitalize="characters"
            className="w-full min-w-0 bg-transparent font-mono font-semibold text-lg text-tinta uppercase tracking-wide focus:outline-none placeholder:text-tinta-tenue/60"
          />
        </label>
      </div>

      {previewImage ? (
        <div className="relative w-full rounded-xl bg-hoja-950 overflow-hidden mb-4 flex items-center justify-center">
          <img
            src={previewImage}
            alt="Muestra capturada"
            className="w-full h-auto max-h-[62vh] object-contain"
          />
          <CornerGuides />
          <button
            onClick={handleResetPreview}
            disabled={isProcessing}
            aria-label="Volver a tomar foto"
            title="Volver a tomar foto"
            className="absolute top-3 right-3 w-11 h-11 bg-hoja-950/75 hover:bg-hoja-950 active:bg-black text-papel-claro rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <CameraOffIcon size={20} />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-4/3 lg:aspect-16/10 bg-hoja-950 rounded-xl overflow-hidden mb-4">
          <CornerGuides />
          {mode === 'camera' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-lima-300 text-hoja-950 flex items-center justify-center mb-4">
                <CameraIcon size={30} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-papel-claro mb-1">Cámara lista</h3>
              <p className="text-salvia-300 text-sm max-w-xs mb-5">
                Abre el visor y encuadra el lote con buena luz. La fruta debe verse completa.
              </p>
              <button
                onClick={handleOpenCameraModal}
                disabled={isProcessing}
                className="min-h-12 bg-lima-300 hover:bg-lima-100 active:bg-lima-500 text-hoja-950 font-semibold text-base px-7 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <CameraIcon size={20} />
                Tomar foto
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 w-full flex flex-col items-center justify-center p-6 text-center hover:bg-hoja-900/60 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-salvia-200 text-hoja-900 flex items-center justify-center mb-4">
                <UploadIcon size={30} />
              </div>
              <span className="font-serif text-xl font-semibold text-papel-claro mb-1">Elegir una foto</span>
              <span className="text-salvia-300 text-sm">Toca para buscar en tu galería. JPG, PNG o WEBP.</span>
            </button>
          )}
        </div>
      )}

      {previewImage && (
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:static z-20 mb-4">
          <button
            onClick={() => onCapture(previewImage, currentLotId)}
            disabled={isProcessing}
            className={`relative w-full min-h-14 px-6 rounded-xl overflow-hidden font-semibold text-lg flex items-center justify-center gap-3 shadow-hoja-lg transition-colors ${
              isProcessing
                ? 'bg-hoja-700 text-papel-claro cursor-wait'
                : 'bg-hoja-800 text-papel-claro hover:bg-hoja-700 active:bg-hoja-950'
            }`}
          >
            {isProcessing ? (
              <>
                <span className="w-5 h-5 rounded-full border-2 border-papel-claro/30 border-t-lima-300 animate-spin" />
                Analizando el lote
                <span aria-hidden="true" className="absolute bottom-0 left-0 h-1 w-full bg-lima-300/70 animate-latir" />
              </>
            ) : (
              <>
                <AnalyzeIcon size={22} />
                Analizar
              </>
            )}
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-dashed border-linea">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-hoja-800">
          <ImagesIcon size={16} />
          Muestras de prueba
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-proximity scroll-px-4 sm:scroll-px-6 sin-barra -mx-4 px-4 sm:-mx-6 sm:px-6 pb-1">
          {SAMPLE_PHOTOS.map((sample, index) => {
            const selected = previewImage === sample.imageUrl;
            return (
              <button
                key={sample.name}
                onClick={() => handleSelectSample(sample.imageUrl)}
                disabled={isProcessing}
                aria-pressed={selected}
                className="snap-start shrink-0 w-28 text-center disabled:opacity-60"
              >
                <span className={`block w-28 h-28 rounded-xl overflow-hidden bg-papel-hondo border-2 transition-colors ${selected ? 'border-hoja-800' : 'border-transparent'}`}>
                  <SampleThumb src={sample.thumbUrl} name={sample.name} eager={index < 3} />
                </span>
                <span className={`block mt-2 px-0.5 text-xs leading-snug ${selected ? 'font-bold text-hoja-900' : 'text-tinta-suave'}`}>
                  {sample.name}
                </span>
              </button>
            );
          })}
          <span aria-hidden="true" className="shrink-0 w-1" />
        </div>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-fundido touch-none select-none">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-6">
            <div className="w-64 h-64 sm:w-80 sm:h-80 relative">
              <CornerGuides inset="inset-0" size="w-10 h-10" />
            </div>
          </div>

          <div className="relative z-20 px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex items-center justify-between bg-linear-to-b from-black/70 to-transparent">
            <button
              onClick={handleCloseCameraModal}
              className="w-12 h-12 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Cerrar cámara"
            >
              <CloseIcon size={24} />
            </button>

            <p className="text-sm text-white/85 font-medium">Encuadra la fruta dentro de las guías</p>

            <button
              onClick={toggleFacingMode}
              className="w-12 h-12 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Rotar cámara"
              title="Rotar cámara"
            >
              <SwitchCameraIcon size={22} />
            </button>
          </div>

          {cameraError && (
            <div className="relative z-30 m-6 p-5 bg-hoja-950/95 border border-lima-300/60 rounded-xl text-center">
              <p className="text-papel-claro text-sm mb-4">{cameraError}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="min-h-11 bg-lima-300 text-hoja-950 font-semibold text-sm px-4 rounded-lg"
                >
                  Abrir foto nativa
                </button>
                <button
                  onClick={handleCloseCameraModal}
                  className="min-h-11 bg-papel-claro text-hoja-950 font-semibold text-sm px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="relative z-20 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 px-6 flex items-center justify-center bg-linear-to-t from-black/75 to-transparent">
            <button
              onClick={handleTakeSnapshot}
              className="w-20 h-20 rounded-full border-4 border-white p-1.5 flex items-center justify-center cursor-pointer focus:outline-none"
              aria-label="Capturar fotografía"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-lima-300 transition-colors" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
