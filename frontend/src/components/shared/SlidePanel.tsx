import { useEffect, useRef, type ReactNode } from 'react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: 'right' | 'bottom';
  children: ReactNode;
}

const PANEL_CLASS = {
  right: 'inset-y-0 right-0 w-full max-w-[30rem] starting:translate-x-full',
  bottom: 'inset-x-0 bottom-0 mx-auto w-full max-w-lg max-h-[90dvh] rounded-t-3xl starting:translate-y-full',
} as const;

export function SlidePanel({ open, onClose, label, side = 'right', children }: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Always call the latest onClose without re-running the effect below
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Ignore Escape pressed inside another dialog opened on top of this panel
      const active = document.activeElement;
      if (active && active !== document.body && !panelRef.current?.contains(active)) return;
      onCloseRef.current();
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 transition-opacity duration-200 starting:opacity-0"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`absolute flex flex-col bg-background shadow-2xl outline-none transition-transform duration-200 motion-reduce:transition-none ${PANEL_CLASS[side]}`}
      >
        {children}
      </div>
    </div>
  );
}