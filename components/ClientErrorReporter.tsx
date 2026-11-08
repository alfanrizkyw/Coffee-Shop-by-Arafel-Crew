'use client';

import { useEffect } from 'react';

let sent = 0;

function report(pesan: string, detail: string) {
  if (sent >= 10) return;
  sent++;
  try {
    fetch('/api/public/clientlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pesan: pesan.slice(0, 500), detail: detail.slice(0, 2000) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // reporting must never break the app
  }
}

export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      report(e.message || 'Error tidak diketahui', `${e.filename || ''}:${e.lineno || 0} | ${e.error?.stack || ''}`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(r?.message || String(r), r?.stack || '');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}