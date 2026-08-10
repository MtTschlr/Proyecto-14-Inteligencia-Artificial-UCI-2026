import React from 'react';

interface HeaderProps {
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({ historyCount }) => {
  return (
    <header className="relative overflow-hidden w-full bg-slate-950 text-white border-b-2 border-slate-800 px-3 py-3.5 sm:px-6 shadow-md">
      {/* Dense Repeating Fruit Pattern Background in Navbar */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-repeat select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='160' height='60' viewBox='0 0 160 60' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3C!-- Apple --%3E%3Cpath d='M15 15c-3 0-5 2-5 5 0 8 7 14 7 14s7-6 7-14c0-3-2-5-5-5-2 0-3.5 1-4 2-.5-1-2-2-4-2z'/%3E%3C!-- Orange --%3E%3Ccircle cx='55' cy='22' r='10'/%3E%3C!-- Banana --%3E%3Cpath d='M85 30c6 0 12 6 12 12 0 1-1 2-2 1-5-4-9-6-13-7-1 0-1-2 0-3 1-2 2-3 3-3z'/%3E%3C!-- Strawberry --%3E%3Cpath d='M125 18c-4 0-7 3-7 8 0 5 7 10 7 10s7-5 7-10c0-5-3-8-7-8z'/%3E%3C!-- Cherries --%3E%3Ccircle cx='25' cy='48' r='5'/%3E%3Ccircle cx='35' cy='46' r='5'/%3E%3Cpath d='M25 43c3-5 7-8 7-8s2 4 3 11' stroke='white' stroke-width='1.5' fill='none'/%3E%3C!-- Avocado --%3E%3Cellipse cx='145' cy='45' rx='7' ry='9'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Pure Sacred Apple Icon */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <img
            src="/sacred-apple.png"
            alt="Sacred Fruit Icon"
            className="w-11 h-11 sm:w-14 sm:h-14 object-contain shrink-0 filter drop-shadow-md hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-brand font-black text-2xl sm:text-3xl uppercase tracking-tight text-white leading-none drop-shadow-sm whitespace-nowrap">
                Sacred Fruit
              </h1>
              <span className="bg-emerald-300 text-slate-950 font-black text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-mono tracking-wider shrink-0">
                PWA
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 font-mono mt-1 font-bold uppercase tracking-wider truncate">
              Control de calidad e inspección
            </p>
          </div>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* History Counter Pill */}
          <div className="flex items-center px-3 py-1.5 bg-slate-800/90 text-slate-200 rounded-xl border border-slate-700 font-mono text-xs sm:text-sm font-black whitespace-nowrap backdrop-blur-sm shadow-sm">
            Scans: {historyCount}
          </div>
        </div>
      </div>
    </header>
  );
};
