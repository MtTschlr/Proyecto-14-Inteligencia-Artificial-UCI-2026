import React, { useState, useEffect } from 'react';
import type { BackendConfig } from '../types';
import { CloseIcon, CheckIcon, AlertIcon } from './CustomIcons';

interface FastApiConfigModalProps {
  config: BackendConfig;
  onSave: (newConfig: BackendConfig) => void;
  onClose: () => void;
}

export const FastApiConfigModal: React.FC<FastApiConfigModalProps> = ({ config, onSave, onClose }) => {
  const [apiUrl, setApiUrl] = useState<string>(config.apiUrl);
  const [useMock, setUseMock] = useState<boolean>(config.useMock);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState<string>('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg('Conectando a FastAPI...');
    try {
      await fetch(`${apiUrl.replace(/\/$/, '')}/docs`, { method: 'HEAD', mode: 'no-cors' });
      setTestStatus('success');
      setTestMsg(`Servidor alcanzado en ${apiUrl}`);
    } catch {
      setTestStatus('error');
      setTestMsg(`No se pudo conectar a ${apiUrl}. Verifica que FastAPI esté corriendo.`);
    }
  };

  const handleSave = () => {
    onSave({
      ...config,
      apiUrl,
      useMock,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black text-white p-1.5 rounded-full border-2 border-black hover:bg-slate-800"
        >
          <CloseIcon size={18} />
        </button>

        <h3 className="text-xl font-brand font-black text-black mb-1">Configuración FastAPI</h3>
        <p className="text-xs font-medium text-slate-500 mb-4 border-b-2 border-slate-200 pb-2">
          Integración del modelo de inteligencia artificial
        </p>

        <div className="space-y-4 text-xs mb-6">
          <div>
            <label className="block font-bold text-black mb-1">URL del Backend (FastAPI):</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full font-mono font-bold text-sm bg-slate-100 border-2 border-black rounded-2xl p-2.5 text-black focus:bg-emerald-50 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              Endpoint esperado: POST /api/v1/classify (multipart/form-data)
            </span>
          </div>

          <div className="border-2 border-black rounded-2xl p-3 bg-slate-100">
            <label className="flex items-center gap-2 font-bold text-black cursor-pointer">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="w-4 h-4 accent-black border-2 border-black rounded"
              />
              Forzar modo demo simulado
            </label>
            <p className="text-[10px] text-slate-600 font-medium mt-1">
              Activa la simulación local de inferencia sin requerir servidor activo.
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="w-full bg-slate-200 text-black border-2 border-black rounded-2xl p-2.5 font-bold hover:bg-slate-300 transition-colors"
          >
            {testStatus === 'testing' ? 'Probando conexión...' : 'Probar ping a API'}
          </button>

          {testStatus === 'success' && (
            <div className="bg-emerald-700 text-white border-2 border-black rounded-2xl p-2.5 font-bold flex items-center gap-2">
              <CheckIcon size={16} />
              <span>{testMsg}</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="bg-red-700 text-white border-2 border-black rounded-2xl p-2.5 font-bold flex items-center gap-2">
              <AlertIcon size={16} />
              <span>{testMsg}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t-2 border-black">
          <button
            onClick={handleSave}
            className="flex-1 bg-black text-white hover:bg-slate-900 border-2 border-black rounded-2xl py-2.5 font-bold text-sm transition-colors"
          >
            Guardar
          </button>
          <button
            onClick={onClose}
            className="bg-white text-black hover:bg-slate-200 border-2 border-black rounded-2xl py-2.5 px-4 font-bold text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
