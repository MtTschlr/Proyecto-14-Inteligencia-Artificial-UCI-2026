import React, { useEffect } from 'react';

interface SheetProps {
  onClose: () => void;
  labelledBy: string;
  widthClass?: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ onClose, labelledBy, widthClass = 'sm:max-w-md', children }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-hoja-950/60 sm:p-6 animate-fundido"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${widthClass} max-h-[94dvh] flex flex-col bg-papel-claro rounded-t-2xl sm:rounded-2xl shadow-hoja-lg animate-hoja sm:animate-dialogo`}
      >
        <div aria-hidden="true" className="sm:hidden mx-auto mt-2.5 mb-1 h-1.5 w-10 rounded-full bg-linea shrink-0" />
        {children}
      </div>
    </div>
  );
};
