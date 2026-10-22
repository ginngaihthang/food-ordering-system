import { useEffect, type ReactNode } from 'react';

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label?: string;
}

export function SidebarDrawer({
  open,
  onClose,
  children,
  label = 'Navigation menu',
}: SidebarDrawerProps) {
  // While open: Escape closes it, and the page behind can't scroll
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-[visibility] duration-200 lg:hidden ${
        open ? 'visible' : 'invisible'
      }`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute inset-y-0 left-0 w-64 max-w-[85vw] bg-background shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </aside>
    </div>
  );
}