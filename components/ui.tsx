'use client';

import { useEffect, useRef } from 'react';
import { Loader2, X, AlertTriangle, Leaf } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-moss">
      <Loader2 size={28} className="animate-spin text-forest-400" aria-hidden />
      <p className="text-sm">{t(label ?? 'Memuat…')}</p>
    </div>
  );
}

export function Alert({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'warn' | 'info' }) {
  const cls = tone === 'error'
    ? 'border-danger/40 bg-danger/10 text-red-200'
    : tone === 'warn'
      ? 'border-wood-400/40 bg-wood-400/10 text-wood-300'
      : 'border-sky/40 bg-sky/10 text-sky';
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${cls}`} role="alert">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Leaf size={32} className="text-forest-600" aria-hidden />
      <p className="font-display font-semibold text-cream-dim">{t(title)}</p>
      {desc && <p className="text-sm text-moss max-w-xs">{t(desc)}</p>}
    </div>
  );
}

// Modal bertumpuk (mis. crop di atas form menu) harus menutup yang paling atas saja.
const modalStack: symbol[] = [];

export function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('modal');
    modalStack.push(id);
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      const i = modalStack.indexOf(id);
      if (i >= 0) modalStack.splice(i, 1);
      if (modalStack.length === 0) document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 anim-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92dvh] overflow-y-auto bg-forest-850 border border-forest-700 rounded-t-2xl sm:rounded-2xl shadow-sheet anim-scale-in pb-[env(safe-area-inset-bottom)] sm:pb-0`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-forest-850 border-b border-forest-750">
          <h2 className="font-display font-bold text-lg truncate">{title}</h2>
          <button onClick={onClose} className="btn-ghost !min-h-[36px] !px-2.5 !py-1.5" aria-label={t('Tutup')}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, desc, confirmLabel = 'Ya, Lanjutkan', danger = false, busy = false }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  desc: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t(title)}>
      <p className="text-sm text-cream-dim mb-5">{t(desc)}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1" disabled={busy}>{t('Batal')}</button>
        <button onClick={onConfirm} className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`} disabled={busy}>
          {busy ? t('Memproses…') : t(confirmLabel)}
        </button>
      </div>
    </Modal>
  );
}