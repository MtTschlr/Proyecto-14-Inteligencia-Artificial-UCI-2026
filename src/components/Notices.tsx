import type { NoFruitResponse, QualityIssue, ScanFailure } from '../types';
import { Icon } from './Icon';

const ISSUE_TEXT: Record<QualityIssue, { icon: string; title: string; text: string }> = {
  oscura: { icon: 'moon', title: 'La foto está oscura', text: 'Con poca luz el modelo confunde colores y estados. Buscá luz natural o prendé una lámpara.' },
  borrosa: { icon: 'camera', title: 'La foto parece movida o sin detalle', text: 'Apoyá el teléfono, tocá la pantalla para enfocar y esperá a que la imagen quede nítida.' },
};

export function QualityWarnings({ issues }: { issues: QualityIssue[] }) {
  if (!issues.length) return null;
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <div key={issue} role="status" className="flex items-start gap-3 rounded-2xl bg-sol-100 text-sol-900 p-3.5">
          <Icon name={ISSUE_TEXT[issue].icon} size={18} className="mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">{ISSUE_TEXT[issue].title}</p>
            <p>{ISSUE_TEXT[issue].text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const REASON_HEAD: Record<string, { icon: string; title: string }> = {
  no_es_fruta: { icon: 'ban', title: 'Eso no es una fruta del sistema' },
  sin_deteccion: { icon: 'search-alt', title: 'No encontramos ninguna fruta' },
  muy_chica: { icon: 'search-alt', title: 'La fruta se ve muy chica' },
  forma: { icon: 'cube', title: 'Parece un objeto, no una fruta' },
  confianza_baja: { icon: 'question', title: 'El modelo no está seguro' },
};

const TIPS = [
  'Que se vea la fruta entera, no solo un pedazo.',
  'Acercate hasta que ocupe buena parte de la foto.',
  'Usá un fondo liso que no sea del mismo color que la fruta.',
  'El sistema reconoce banana, mango, naranja y tomate.',
];

interface NoFruitNoticeProps {
  response: NoFruitResponse;
  onRetry: () => void;
}

export function NoFruitNotice({ response, onRetry }: NoFruitNoticeProps) {
  const head = REASON_HEAD[response.reason ?? 'sin_deteccion'] ?? REASON_HEAD.sin_deteccion;
  return (
    <article className="rounded-[28px] bg-hoja shadow-ficha overflow-hidden animate-entrar">
      <div className="bg-anil-950 text-hoja px-5 sm:px-6 py-6 rayado">
        <span className="w-12 h-12 rounded-2xl bg-lima-400 text-anil-950 flex items-center justify-center">
          <Icon name={head.icon} size={22} />
        </span>
        <h2 className="font-display text-3xl font-extrabold leading-tight mt-4">{head.title}</h2>
        <p className="text-anil-100 mt-2">{response.detail}</p>
      </div>
      <div className="px-5 sm:px-6 py-5 space-y-5">
        <QualityWarnings issues={response.quality?.issues ?? []} />
        <div>
          <h3 className="font-display font-bold text-lg mb-2">Para la próxima foto</h3>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={tip} className="flex gap-3 text-sm text-tinta-2">
                <span className="font-mono text-xs w-6 h-6 shrink-0 rounded-full bg-piedra-2 flex items-center justify-center">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onRetry} className="w-full min-h-13 rounded-2xl bg-lima-400 hover:bg-lima-300 text-anil-950 font-bold flex items-center justify-center gap-2 transition-colors">
          <Icon name="camera" size={18} />
          Sacar otra foto
        </button>
      </div>
    </article>
  );
}

const FAILURE_ICON: Record<ScanFailure['kind'], string> = {
  sin_internet: 'wifi-slash',
  servidor_caido: 'plug-connection',
  tiempo_agotado: 'stopwatch',
  no_es_imagen: 'image-slash',
  imagen_corrupta: 'image-slash',
  muy_grande: 'picture',
  error_servidor: 'triangle-warning',
};

interface FailureNoticeProps {
  failure: ScanFailure;
  onRetry?: () => void;
  onOther: () => void;
  onSaved?: () => void;
}

export function FailureNotice({ failure, onRetry, onOther, onSaved }: FailureNoticeProps) {
  const network = ['sin_internet', 'servidor_caido', 'tiempo_agotado', 'error_servidor'].includes(failure.kind);
  return (
    <article role="alert" className="rounded-[28px] bg-hoja shadow-ficha overflow-hidden animate-entrar">
      <div className="px-5 sm:px-6 py-6 bg-frambuesa-100 text-frambuesa-900">
        <span className="w-12 h-12 rounded-2xl bg-frambuesa-500 text-hoja flex items-center justify-center">
          <Icon name={FAILURE_ICON[failure.kind]} size={22} />
        </span>
        <h2 className="font-display text-3xl font-extrabold leading-tight mt-4">{failure.title}</h2>
        <p className="mt-2">{failure.message}</p>
        {failure.hint && <p className="text-sm mt-2 opacity-85">{failure.hint}</p>}
      </div>
      <div className="px-5 sm:px-6 py-5 space-y-2.5">
        {network && onRetry && (
          <button onClick={onRetry} className="w-full min-h-13 rounded-2xl bg-anil-700 hover:bg-anil-600 text-hoja font-bold flex items-center justify-center gap-2 transition-colors">
            <Icon name="rotate-right" size={18} />
            Reintentar con la misma foto
          </button>
        )}
        {onSaved && (
          <button onClick={onSaved} className="w-full min-h-13 rounded-2xl bg-sol-100 hover:bg-sol-500/40 text-sol-900 font-bold flex items-center justify-center gap-2 transition-colors">
            <Icon name="time-past" size={18} />
            Ver el resultado guardado
          </button>
        )}
        <button onClick={onOther} className="w-full min-h-13 rounded-2xl bg-piedra-2 hover:bg-piedra-3 text-tinta font-bold flex items-center justify-center gap-2 transition-colors">
          <Icon name="picture" size={18} />
          Elegir otra foto
        </button>
      </div>
    </article>
  );
}
