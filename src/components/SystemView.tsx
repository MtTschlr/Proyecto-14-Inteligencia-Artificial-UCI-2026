import { useEffect, useState } from 'react';
import type { BackendStatus, HealthInfo, ModelInfo, Sample } from '../types';
import { DEFAULT_API_URL, fetchModelInfo } from '../services/api';
import { STATUS_TEXT } from '../lib/useBackend';
import { prettyLabel } from '../lib/states';
import { Icon } from './Icon';

interface SystemViewProps {
  apiUrl: string;
  status: BackendStatus;
  health: HealthInfo | null;
  samples: Sample[];
  onSaveUrl: (url: string) => void;
  onRefresh: () => Promise<void>;
}

const THRESHOLD_TEXT: Record<string, string> = {
  defect_conf: 'Confianza mínima de una zona dañada',
  min_area: 'Superficie mínima de una fruta',
  min_cluster: 'Superficie mínima de un racimo',
  max_fill: 'Relleno máximo del recuadro (forma)',
  red_swap: 'Rojo para pasar de naranja a tomate',
};

export function SystemView({ apiUrl, status, health, samples, onSaveUrl, onRefresh }: SystemViewProps) {
  const [url, setUrl] = useState(apiUrl);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [infoError, setInfoError] = useState(false);
  const [testing, setTesting] = useState(false);
  const s = STATUS_TEXT[status];

  useEffect(() => {
    let alive = true;
    fetchModelInfo(apiUrl)
      .then((data) => {
        if (!alive) return;
        setInfo(data);
        setInfoError(false);
      })
      .catch(() => {
        if (alive) setInfoError(true);
      });
    return () => {
      alive = false;
    };
  }, [apiUrl, status]);

  const test = async () => {
    setTesting(true);
    onSaveUrl(url.trim() || DEFAULT_API_URL);
    await onRefresh();
    setTesting(false);
  };

  const fruitClasses = info?.model.classes.filter((c) => c !== 'defecto') ?? [];

  return (
    <section className="animate-entrar grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 items-start">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-tinta-3 uppercase tracking-[0.14em]">Estado y configuración</p>
          <h2 className="font-display text-4xl font-extrabold leading-none mt-1">Sistema</h2>
        </div>

        <div className="rounded-[28px] bg-anil-950 text-hoja p-5 rayado">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${s.tone}`}>
            <Icon name={s.icon} size={14} />
            {s.label}
          </span>
          {health ? (
            <dl className="grid grid-cols-2 gap-4 mt-5 text-sm">
              <div><dt className="text-anil-300 text-xs">Modelo principal</dt><dd className="font-mono font-semibold">{health.model}</dd></div>
              <div><dt className="text-anil-300 text-xs">Respaldo</dt><dd className="font-mono font-semibold">{health.fallback.file ?? 'apagado'}</dd></div>
              <div><dt className="text-anil-300 text-xs">CLIP</dt><dd className="font-semibold">{health.clip.active ? 'activo' : health.clip.requested ? 'no pudo cargar' : 'apagado'}</dd></div>
              <div><dt className="text-anil-300 text-xs">Encendido hace</dt><dd className="font-mono font-semibold">{Math.floor(health.uptime_s / 60)} min</dd></div>
              {health.clip.error && health.clip.requested && (
                <div className="col-span-2"><dt className="text-anil-300 text-xs">Motivo</dt><dd className="font-mono text-xs break-words">{health.clip.error}</dd></div>
              )}
            </dl>
          ) : (
            <p className="text-anil-100 mt-4 text-sm">
              {status === 'verificando' ? 'Consultando al servidor…' : 'No hay respuesta del servidor. Revisá que esté encendido y la dirección de abajo.'}
            </p>
          )}
        </div>

        <div className="rounded-[28px] bg-hoja shadow-ficha p-5">
          <label htmlFor="api-url" className="font-display font-bold text-lg flex items-center gap-2">
            <Icon name="plug-connection" size={16} />
            Dirección del servidor
          </label>
          <p className="text-xs text-tinta-2 mt-1">
            Con <code className="font-mono">/api</code> la foto pasa por el mismo servidor que sirve la app. Para otro equipo, escribí la dirección completa, por ejemplo <code className="font-mono">http://192.168.0.10:8000</code>.
          </p>
          <input
            id="api-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            spellCheck={false}
            className="mt-3 w-full min-h-12 rounded-2xl bg-piedra px-4 font-mono text-base focus:outline-none focus-visible:outline-3 focus-visible:outline-anil-600"
          />
          <button onClick={test} disabled={testing} className="mt-3 w-full min-h-12 rounded-2xl bg-anil-700 hover:bg-anil-600 text-hoja font-bold transition-colors disabled:opacity-60">
            {testing ? 'Probando…' : 'Guardar y probar conexión'}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] bg-hoja shadow-ficha p-5 sm:p-6">
          <h3 className="font-display text-2xl font-extrabold">Cómo funciona</h3>
          <ol className="grid sm:grid-cols-2 gap-2.5 mt-4">
            {[
              ['layers', 'Segmentación', 'YOLO11s-seg marca cada fruta y cada zona dañada con su contorno.'],
              ['filter', 'Filtros', 'Descarta lo que tiene poca confianza, es muy chico o tiene forma de caja.'],
              ['brain', 'CLIP', 'Mira cada recorte y descarta lo que parece otra cosa, como una manzana o una pelota.'],
              ['truck-side', 'Reglas', 'Con fruta y estado calcula vida útil, calibre y qué hacer con el lote.'],
            ].map(([icon, title, text], i) => (
              <li key={title} className="rounded-2xl bg-piedra p-4">
                <span className="font-mono text-[11px] text-tinta-3">Paso {i + 1}</span>
                <p className="font-display font-bold flex items-center gap-2 mt-1"><Icon name={icon} size={15} className="text-anil-600" />{title}</p>
                <p className="text-sm text-tinta-2 mt-1">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[28px] bg-hoja shadow-ficha p-5 sm:p-6">
          <h3 className="font-display text-2xl font-extrabold">Modelo cargado</h3>
          {info ? (
            <>
              <p className="text-sm text-tinta-2 mt-1">
                <code className="font-mono">{info.model.file}</code> {info.model.version && `(${info.model.version})`}, {info.model.classes.length} clases
                {info.model.epochs ? `, ${info.model.epochs} épocas` : ''}
                {info.model.trained_at ? `, entrenado el ${new Date(info.model.trained_at).toLocaleDateString('es-AR')}` : ''}.
              </p>
              <ul className="flex flex-wrap gap-1.5 mt-3">
                {fruitClasses.map((c) => (
                  <li key={c} className="rounded-full bg-anil-100 text-anil-900 px-2.5 py-1 text-xs font-semibold capitalize">{prettyLabel(c)}</li>
                ))}
                <li className="rounded-full bg-frambuesa-100 text-frambuesa-900 px-2.5 py-1 text-xs font-semibold">zona dañada</li>
              </ul>
              <h4 className="font-display font-bold mt-5 mb-2">Umbrales activos</h4>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(info.thresholds.conf_by_fruit).map(([fruit, v]) => (
                    <tr key={fruit} className="odd:bg-piedra/70">
                      <td className="py-1.5 px-2 rounded-l-lg">Confianza mínima de {fruit}</td>
                      <td className="py-1.5 px-2 font-mono text-right rounded-r-lg">{v}</td>
                    </tr>
                  ))}
                  {Object.entries(THRESHOLD_TEXT).map(([key, text]) => (
                    <tr key={key} className="odd:bg-piedra/70">
                      <td className="py-1.5 px-2 rounded-l-lg">{text}</td>
                      <td className="py-1.5 px-2 font-mono text-right rounded-r-lg">{info.thresholds[key as keyof ModelInfo['thresholds']] as number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-tinta-3 mt-3">
                CLIP {info.clip.architecture} ({info.clip.weights}) {info.clip.active ? `revisa hasta ${info.clip.max_crops} recortes por foto` : 'no está activo'}.
                Fotos de hasta {info.limits.max_upload_mb} MB.
              </p>
            </>
          ) : (
            <p className="text-sm text-tinta-2 mt-2">{infoError ? 'No se pudo leer la información del modelo.' : 'Cargando…'}</p>
          )}
        </div>

        <div className="rounded-[28px] bg-hoja shadow-ficha p-5 sm:p-6 text-sm text-tinta-2">
          <h3 className="font-display text-xl font-extrabold text-tinta">Créditos</h3>
          <p className="mt-2">
            Íconos: <a className="underline" href="https://www.flaticon.es/uicons" target="_blank" rel="noreferrer">Uicons de Flaticon</a>. Tipografías: Bricolage Grotesque, Atkinson Hyperlegible Next y Spline Sans Mono (SIL Open Font License).
          </p>
          {samples.length > 0 && (
            <>
              <p className="mt-3 font-semibold text-tinta">Fotos de muestra (Wikimedia Commons)</p>
              <ul className="mt-1 space-y-1 text-xs">
                {samples.filter((m) => m.credit).map((m) => (
                  <li key={m.id}>
                    {m.name}: <a className="underline" href={m.credit!.url} target="_blank" rel="noreferrer">{m.credit!.title}</a>, de {m.credit!.author}, {m.credit!.license}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
