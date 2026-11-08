'use client';

import { useEffect } from 'react';
import { useI18n, LangToggle } from '@/lib/i18n';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    fetch('/api/public/clientlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pesan: `Render error: ${error.message}`.slice(0, 500),
        detail: `digest=${error.digest || '-'} ${error.stack || ''}`.slice(0, 2000),
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <div className="flex justify-center mb-4"><LangToggle /></div>
        <h1 className="font-display text-xl font-bold mb-2">{t('Ada yang salah')}</h1>
        <p className="text-moss text-sm mb-6">
          {t('Halaman mengalami error dan sudah otomatis dilaporkan ke tim developer. Coba muat ulang.')}
        </p>
        <button onClick={reset} className="btn-primary w-full">{t('Coba Lagi')}</button>
      </div>
    </main>
  );
}