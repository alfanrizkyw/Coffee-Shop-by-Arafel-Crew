'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type Tone = 'ok' | 'error' | 'info';
interface Toast { id: number; msg: string; tone: Tone }

const ToastCtx = createContext<(msg: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const ICONS: Record<Tone, typeof Info> = { ok: CheckCircle2, error: AlertTriangle, info: Info };
const COLORS: Record<Tone, string> = {
  ok: 'border-ok/50 text-green-300',
  error: 'border-danger/50 text-red-300',
  info: 'border-sky/50 text-sky',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t: tr } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((msg: string, tone: Tone = 'info') => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div key={t.id} className={`card anim-fade-up flex items-start gap-2.5 px-4 py-3 border ${COLORS[t.tone]} bg-forest-800`}>
              <Icon size={18} className="shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-cream flex-1">{tr(t.msg)}</p>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="text-moss hover:text-cream cursor-pointer p-1 -m-1"
                aria-label={tr('Tutup notifikasi')}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}