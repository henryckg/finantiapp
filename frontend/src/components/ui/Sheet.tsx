import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'panel-elevated safe-bottom relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none sm:max-w-lg sm:rounded-b-panel',
          className,
        )}
      >
        <header className="border-border-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
            {description && <p className="text-text-secondary mt-0.5 text-xs">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-secondary hover:text-text-primary -mt-0.5 rounded p-1 transition-colors hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="scrollbar-none flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <footer className="border-border-subtle bg-bg-elevated flex justify-end gap-2 border-t px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
