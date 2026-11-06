import { useCallback, useEffect, useState } from 'react';
import { fetchHealth } from '../services/api';
import type { BackendStatus, HealthInfo } from '../types';

const POLL_MS = 20000;

export function useBackend(apiUrl: string) {
  const [status, setStatus] = useState<BackendStatus>('verificando');
  const [health, setHealth] = useState<HealthInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const info = await fetchHealth(apiUrl);
      setHealth(info);
      setStatus(info.status === 'ok' ? 'listo' : 'degradado');
    } catch {
      setHealth(null);
      setStatus(navigator.onLine ? 'caido' : 'sin_internet');
    }
  }, [apiUrl]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { status, health, refresh };
}

export const STATUS_TEXT: Record<BackendStatus, { label: string; icon: string; tone: string }> = {
  verificando: { label: 'Conectando', icon: 'plug-connection', tone: 'bg-anil-800 text-anil-100' },
  listo: { label: 'Modelo listo', icon: 'cloud-check', tone: 'bg-anil-800 text-lima-300' },
  degradado: { label: 'Sin CLIP', icon: 'triangle-warning', tone: 'bg-sol-100 text-sol-900' },
  caido: { label: 'Sin servidor', icon: 'plug-connection', tone: 'bg-frambuesa-100 text-frambuesa-900' },
  sin_internet: { label: 'Sin internet', icon: 'wifi-slash', tone: 'bg-frambuesa-100 text-frambuesa-900' },
};
