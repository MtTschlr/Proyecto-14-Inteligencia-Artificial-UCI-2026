import React from 'react';
import { ScanIcon, HistoryIcon, SettingsIcon } from './CustomIcons';

export type AppTab = 'escanear' | 'historial' | 'ajustes';

interface BottomNavProps {
  active: AppTab;
  historyCount: number;
  onChange: (tab: AppTab) => void;
}

const ITEMS: { id: AppTab; label: string; Icon: typeof ScanIcon }[] = [
  { id: 'escanear', label: 'Escanear', Icon: ScanIcon },
  { id: 'historial', label: 'Historial', Icon: HistoryIcon },
  { id: 'ajustes', label: 'Ajustes', Icon: SettingsIcon },
];

export const BottomNav: React.FC<BottomNavProps> = ({ active, historyCount, onChange }) => (
  <nav
    aria-label="Navegación principal"
    className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-papel-claro border-t border-linea shadow-barra pb-seguro"
  >
    <ul className="grid grid-cols-3 px-2 pt-1.5 pb-1.5">
      {ITEMS.map(({ id, label, Icon }) => {
        const selected = active === id;
        return (
          <li key={id}>
            <button
              onClick={() => onChange(id)}
              aria-current={selected ? 'page' : undefined}
              className="w-full min-h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <span
                className={`relative h-8 w-16 rounded-full flex items-center justify-center transition-colors ${
                  selected ? 'bg-salvia-200 text-hoja-900' : 'text-tinta-tenue'
                }`}
              >
                <Icon size={22} />
                {id === 'historial' && historyCount > 0 && (
                  <span className="absolute -top-0.5 right-1.5 min-w-4.5 h-4.5 px-1 rounded-full bg-miel-500 text-miel-900 font-mono text-[10px] leading-4.5 text-center">
                    {historyCount > 99 ? '99+' : historyCount}
                  </span>
                )}
              </span>
              <span className={selected ? 'text-hoja-900' : 'text-tinta-tenue'}>{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
