import React from 'react';
import { WifiIcon, WifiOffIcon, SettingsIcon } from './CustomIcons';

interface HeaderProps {
  historyCount: number;
  isOnline: boolean;
  useMock: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ historyCount, isOnline, useMock, onOpenSettings }) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-hoja-900 text-papel-claro pt-seguro border-b border-hoja-950">
      <div className="max-w-7xl mx-auto h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/sacred-apple.png" alt="" className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg shrink-0" />
          <h1 className="font-serif text-xl lg:text-2xl font-semibold leading-none whitespace-nowrap">Sacred Fruit</h1>
          <span className="hidden sm:inline text-sm text-salvia-300 ml-2 truncate">Control de calidad de frutas</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              isOnline ? 'bg-hoja-800 text-salvia-200' : 'bg-miel-100 text-miel-900'
            }`}
            role="status"
          >
            {isOnline ? <WifiIcon size={14} /> : <WifiOffIcon size={14} />}
            <span>{isOnline ? (useMock ? 'Demo' : 'En línea') : 'Sin conexión'}</span>
          </div>
          <div className="rounded-full bg-hoja-800 px-3 py-1.5 font-mono text-xs text-papel-claro whitespace-nowrap">
            {historyCount} {historyCount === 1 ? 'escaneo' : 'escaneos'}
          </div>
          <button
            onClick={onOpenSettings}
            aria-label="Ajustes"
            className="hidden lg:flex w-11 h-11 items-center justify-center rounded-full text-salvia-200 hover:bg-hoja-800 active:bg-hoja-950 transition-colors"
          >
            <SettingsIcon size={22} />
          </button>
        </div>
      </div>
    </header>
  );
};
