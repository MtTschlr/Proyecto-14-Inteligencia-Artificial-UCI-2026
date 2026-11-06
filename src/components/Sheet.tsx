import { useEffect, type ReactNode } from 'react';

interface SheetProps {
  onClose: () => void;
  labelledBy: string;
  width?: string;
  children: ReactNode;
}

export function Sheet({ onClose, labelledBy, width = 'sm:max-w-md', children }: SheetProps) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-anil-950/65 sm:p-6 animate-fundido" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${width} max-h-[94dvh] flex flex-col bg-hoja rounded-t-3xl sm:rounded-3xl shadow-flota animate-subir sm:animate-entrar`}
      >
        <div aria-hidden="true" className="sm:hidden mx-auto mt-2.5 mb-1 h-1.5 w-11 rounded-full bg-piedra-3 shrink-0" />
        {children}
      </div>
    </div>
  );
}
