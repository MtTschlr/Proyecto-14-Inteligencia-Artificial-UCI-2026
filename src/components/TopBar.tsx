import { Icon } from './Icon';
import { STATUS_TEXT } from '../lib/useBackend';
import type { BackendStatus } from '../types';

export type Tab = 'analizar' | 'historial' | 'sistema';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'analizar', label: 'Analizar', icon: 'camera-viewfinder' },
  { id: 'historial', label: 'Historial', icon: 'apple-crate' },
  { id: 'sistema', label: 'Sistema', icon: 'microscope' },
];

interface TopBarProps {
  tab: Tab;
  status: BackendStatus;
  historyCount: number;
  onTab: (tab: Tab) => void;
}

export function TopBar({ tab, status, historyCount, onTab }: TopBarProps) {
  const s = STATUS_TEXT[status];
  return (
    <header className="sticky top-0 z-30 bg-anil-950 text-hoja pt-seguro">
      <div className="max-w-7xl mx-auto h-15 lg:h-17 px-4 lg:px-8 flex items-center gap-4">
        <button onClick={() => onTab('analizar')} className="flex items-center gap-2.5 min-w-0 shrink-0" aria-label="Ir a Analizar">
          <img src="/sacred-apple.png" alt="" className="w-9 h-9 rounded-xl" />
          <span className="font-display text-[1.35rem] font-extrabold tracking-tight leading-none whitespace-nowrap">Sacred Fruit</span>
        </button>

        <nav aria-label="Secciones" className="hidden lg:flex items-center gap-1 ml-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-lima-400 text-anil-950' : 'text-anil-100 hover:bg-anil-800'
              }`}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
              {t.id === 'historial' && historyCount > 0 && <span className="font-mono text-xs opacity-70">{historyCount}</span>}
            </button>
          ))}
        </nav>

        <button
          onClick={() => onTab('sistema')}
          className={`ml-auto h-10 pl-3 pr-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-opacity hover:opacity-85 ${s.tone}`}
          title="Ver el estado del sistema"
        >
          <Icon name={s.icon} size={15} />
          <span className="whitespace-nowrap">{s.label}</span>
        </button>
      </div>
    </header>
  );
}

export function TabBar({ tab, historyCount, onTab }: Omit<TopBarProps, 'status'>) {
  return (
    <nav aria-label="Secciones" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-anil-950 pb-seguro">
      <ul className="grid grid-cols-3 px-3 py-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <li key={t.id}>
              <button
                onClick={() => onTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className="w-full min-h-14 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold"
              >
                <span className={`relative h-8 w-16 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-lima-400 text-anil-950' : 'text-anil-300'}`}>
                  <Icon name={t.icon} size={19} />
                  {t.id === 'historial' && historyCount > 0 && (
                    <span className="absolute -top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-hoja text-anil-950 font-mono text-[10px] leading-5 text-center">
                      {historyCount > 99 ? '99+' : historyCount}
                    </span>
                  )}
                </span>
                <span className={active ? 'text-hoja' : 'text-anil-300'}>{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
