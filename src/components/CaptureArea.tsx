import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, UploadIcon, SwitchCameraIcon, CloseIcon, CameraOffIcon, AnalyzeIcon } from './CustomIcons';

interface CaptureAreaProps {
  onCapture: (imageDataUrl: string, lotId: string) => void;
  isProcessing: boolean;
  currentLotId: string;
  onChangeLotId: (newLotId: string) => void;
  resetSignal?: number;
}

const SAMPLE_PHOTOS = [
  {
    name: 'Banano Moteado',
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Manzana Roja',
    url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Naranja Fresca',
    url: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Aguacate Hass',
    url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80',
  },
];

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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
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
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraOpen, facingMode]);

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

  return (
    <section className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-7 mb-6 shadow-lg">
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 border-b-2 border-slate-200 pb-4">
        <div className="flex border-2 border-slate-900 rounded-2xl overflow-hidden bg-slate-100 p-1">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              mode === 'camera'
                ? 'bg-black text-white shadow'
                : 'bg-transparent text-slate-700 hover:text-black'
            }`}
          >
            <CameraIcon size={18} />
            Cámara
          </button>
          <button
            onClick={() => {
              setMode('upload');
              setIsCameraOpen(false);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              mode === 'upload'
                ? 'bg-black text-white shadow'
                : 'bg-transparent text-slate-700 hover:text-black'
            }`}
          >
            <UploadIcon size={18} />
            Subir foto
          </button>
        </div>

        <div className="flex items-center gap-2 bg-emerald-200 border-2 border-slate-900 rounded-2xl px-3.5 py-2 font-mono shadow-sm">
          <label htmlFor="lot-input" className="text-xs font-bold text-slate-950 whitespace-nowrap">
            Lote Nº:
          </label>
          <input
            id="lot-input"
            ref={lotInputRef}
            type="text"
            value={currentLotId}
            onFocus={handleLotFocus}
            onChange={(e) => onChangeLotId(e.target.value)}
            placeholder="LOTE-001"
            className="w-full sm:w-36 font-mono font-bold text-base sm:text-sm bg-white border border-slate-900 rounded-xl px-2.5 py-1 text-black focus:outline-none focus:ring-2 focus:ring-black uppercase transition-all"
          />
        </div>
      </div>

      {previewImage ? (
        <div className="relative w-full rounded-3xl border-3 border-slate-900 bg-slate-950 overflow-hidden mb-5 shadow-lg flex items-center justify-center p-2">
          <img
            src={previewImage}
            alt="Muestra capturada"
            className="w-full h-auto max-h-[75vh] object-contain rounded-2xl"
          />
          <button
            onClick={handleResetPreview}
            disabled={isProcessing}
            aria-label="Volver a tomar foto"
            title="Volver a tomar foto"
            className="absolute top-4 right-4 w-11 h-11 bg-slate-950/80 hover:bg-red-600 text-white rounded-full border-2 border-white/80 shadow-xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <CameraOffIcon size={20} />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-4/3 sm:aspect-16/9 bg-slate-950 rounded-3xl border-3 border-slate-900 flex items-center justify-center overflow-hidden mb-5 shadow-inner">
          {mode === 'camera' ? (
            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-200 border-3 border-black flex items-center justify-center mb-4 shadow-lg">
                <CameraIcon className="w-10 h-10 text-slate-950" />
              </div>
              <h3 className="text-white font-black text-xl mb-1">Cámara lista</h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-5">
                Presiona el botón para abrir el visor en pantalla completa y capturar la fruta.
              </p>
              <button
                onClick={handleOpenCameraModal}
                disabled={isProcessing}
                className="bg-emerald-300 hover:bg-emerald-200 text-slate-950 font-brand font-black text-lg px-8 py-3.5 rounded-2xl border-3 border-black shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <CameraIcon size={22} />
                Tomar foto
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-6 cursor-pointer border-4 border-dashed border-slate-300 hover:border-slate-800 transition-colors text-center rounded-3xl"
            >
              <UploadIcon className="w-14 h-14 text-slate-800 mb-3" />
              <p className="text-black font-bold text-base mb-1">Haz clic para seleccionar una foto</p>
              <p className="text-slate-500 text-xs">Soporta formato JPG, PNG o WEBP</p>
            </div>
          )}
        </div>
      )}

      {previewImage && (
        <button
          onClick={() => onCapture(previewImage, currentLotId)}
          disabled={isProcessing}
          className={`w-full py-4 px-6 rounded-2xl border-3 border-black font-brand font-black text-xl sm:text-2xl tracking-wide flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md ${
            isProcessing
              ? 'bg-slate-300 text-slate-700 cursor-not-allowed border-slate-400'
              : 'bg-black text-white hover:bg-slate-900 active:bg-slate-950'
          }`}
        >
          <AnalyzeIcon className="w-7 h-7" />
          {isProcessing ? 'Analizando...' : 'Analizar'}
        </button>
      )}

      <div className="mt-5 pt-4 border-t-2 border-slate-200">
        <p className="text-xs font-bold text-slate-700 mb-2.5">
          Muestras rápidas de prueba:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SAMPLE_PHOTOS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSample(sample.url)}
              disabled={isProcessing}
              className="flex items-center gap-2.5 p-2 rounded-2xl border-2 border-slate-900 bg-slate-50 hover:bg-emerald-200 text-left transition-all hover:shadow-sm"
            >
              <img src={sample.url} alt={sample.name} className="w-9 h-9 object-cover rounded-xl border border-black" />
              <span className="text-xs font-bold text-black leading-tight truncate">
                {sample.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-fade-in touch-none select-none">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-6">
            <div className="w-64 h-64 sm:w-80 sm:h-80 border-2 border-white/60 border-dashed rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-300 rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-300 rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-300 rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-300 rounded-br-2xl" />
            </div>
          </div>

          <div className="relative z-20 p-5 pt-8 sm:pt-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <button
              onClick={handleCloseCameraModal}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/30 flex items-center justify-center hover:bg-black/90 active:scale-90 transition-transform shadow-lg"
              aria-label="Cerrar cámara"
            >
              <CloseIcon size={22} />
            </button>

            <button
              onClick={toggleFacingMode}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/30 flex items-center justify-center hover:bg-black/90 active:scale-90 transition-transform shadow-lg"
              aria-label="Rotar cámara"
              title="Rotar cámara"
            >
              <SwitchCameraIcon size={22} />
            </button>
          </div>

          {cameraError && (
            <div className="relative z-30 m-6 p-5 bg-black/90 border-2 border-emerald-300 rounded-3xl text-center backdrop-blur-md">
              <p className="text-white text-xs sm:text-sm mb-4 font-medium">{cameraError}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="bg-emerald-300 text-black font-bold text-xs px-4 py-2.5 rounded-xl border border-black"
                >
                  Abrir foto nativa
                </button>
                <button
                  onClick={handleCloseCameraModal}
                  className="bg-white text-black font-bold text-xs px-4 py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="relative z-20 pb-10 pt-6 px-6 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <button
              onClick={handleTakeSnapshot}
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-white p-1.5 flex items-center justify-center cursor-pointer transition-transform active:scale-90 hover:scale-105 shadow-2xl focus:outline-none"
              aria-label="Capturar fotografía"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-slate-300 shadow-inner" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
