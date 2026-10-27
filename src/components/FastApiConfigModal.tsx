import React, { useState } from 'react';
import type { BackendConfig } from '../types';
import { CloseIcon, CheckIcon, AlertIcon, PlugIcon, SparklesIcon } from './CustomIcons';
import { Sheet } from './Sheet';

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

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg('Conectando al backend...');
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => null);
      setTestStatus('success');
      setTestMsg(
        data?.classes
          ? `Conectado a ${data.model}. Modelo cargado con ${data.classes.length} clases.`
          : `Servidor alcanzado en ${apiUrl}`
      );
    } catch {
      setTestStatus('error');
      setTestMsg(`No se pudo conectar a ${apiUrl}. Verifica que el backend esté corriendo.`);
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
    <Sheet onClose={onClose} labelledBy="config-title">
      <div className="overflow-y-auto min-h-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 id="config-title" className="font-serif text-2xl font-semibold text-hoja-900 leading-tight">Ajustes</h3>
            <p className="text-sm text-tinta-suave mt-1">Conecta el modelo best.pt o trabaja en modo demo.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 -mt-1 -mr-2 flex items-center justify-center rounded-full text-tinta-suave hover:bg-papel-hondo"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        <div className="space-y-5">
          <button
            type="button"
            role="switch"
            aria-checked={useMock}
            onClick={() => setUseMock((v) => !v)}
            className="w-full flex items-center gap-3 text-left rounded-xl border border-linea bg-papel-hondo/60 p-3.5 min-h-16"
          >
            <span className="w-10 h-10 rounded-lg bg-miel-100 text-miel-700 flex items-center justify-center shrink-0">
              <SparklesIcon size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-tinta">Modo demo</span>
              <span className="block text-xs text-tinta-suave">Resultados simulados, sin servidor ni modelo.</span>
            </span>
            <span className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${useMock ? 'bg-hoja-700' : 'bg-linea'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-papel-claro shadow transition-[left] duration-200 ${useMock ? 'left-5.5' : 'left-0.5'}`} />
            </span>
          </button>

          <div className={useMock ? 'opacity-50' : ''}>
            <label htmlFor="api-url" className="flex items-center gap-2 text-sm font-semibold text-tinta mb-1.5">
              <PlugIcon size={16} />
              Dirección del backend
            </label>
            <input
              id="api-url"
              type="text"
              inputMode="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="/api"
              className="w-full min-h-12 font-mono text-base bg-papel border border-linea rounded-xl px-3.5 text-tinta focus:outline-none"
            />
            <span className="text-xs text-tinta-tenue block mt-1.5">
              Con <span className="font-mono">/api</span> la foto pasa por el mismo servidor de la app, así funciona también desde el celular.
              Para un backend en otra máquina, escribí su dirección completa.
            </span>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="w-full min-h-12 border border-hoja-700/50 text-hoja-800 hover:bg-salvia-100 active:bg-salvia-200 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {testStatus === 'testing' ? 'Probando conexión...' : 'Probar conexión'}
          </button>

          {testStatus === 'success' && (
            <div role="status" className="bg-lima-100 text-lima-900 border border-lima-300 rounded-xl p-3 text-sm font-medium flex items-start gap-2">
              <CheckIcon size={18} className="mt-0.5" />
              <span>{testMsg}</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div role="alert" className="bg-terracota-100 text-terracota-900 border border-terracota-300 rounded-xl p-3 text-sm font-medium flex items-start gap-2">
              <AlertIcon size={18} className="mt-0.5" />
              <span>{testMsg}</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-tinta-tenue mt-6">Iconos de Flaticon (UIcons).</p>
      </div>

      <div className="flex gap-3 px-5 sm:px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-linea shrink-0">
        <button
          onClick={onClose}
          className="flex-1 min-h-12 border border-linea text-tinta hover:bg-papel-hondo rounded-xl font-semibold text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 min-h-12 bg-hoja-800 text-papel-claro hover:bg-hoja-700 active:bg-hoja-950 rounded-xl font-semibold text-sm transition-colors"
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
};
