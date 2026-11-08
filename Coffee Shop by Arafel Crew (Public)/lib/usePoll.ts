'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function usePoll<T>(url: string | null, intervalMs: number, onData?: (data: T) => void) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);
  const failures = useRef(0);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const refresh = useCallback(async () => {
    if (!url || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || `Error ${res.status}`);
      setData(json as T);
      setError(null);
      failures.current = 0;
      onDataRef.current?.(json as T);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
      failures.current = Math.min(failures.current + 1, 5);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    setData(null);
    setError(null);
    failures.current = 0;
    refresh();

    const tick = () => {
      const delay = Math.min(intervalMs * Math.pow(2, failures.current), 60000);
      timer = setTimeout(async () => {
        if (cancelled) return;
        if (!document.hidden) await refresh();
        if (!cancelled) tick();
      }, delay);
    };
    tick();

    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, intervalMs, refresh]);

  return { data, error, loading, refresh };
}