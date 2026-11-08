'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, RotateCcw, ZoomIn } from 'lucide-react';
import { Alert, Modal } from '@/components/ui';
import { clampCropOffset, cropLayout, exportCrop, loadImageForCrop, CropSource } from '@/lib/image-client';
import { useI18n } from '@/lib/i18n';

const MAX_ZOOM = 3;

export default function CropModal({ open, file, ratio, maxDim, quality = 0.82, onCancel, onConfirm }: {
  open: boolean;
  file: File | null;
  ratio: number;
  maxDim: number;
  quality?: number;
  onCancel: () => void;
  onConfirm: (b64: string) => void;
}) {
  const { t } = useI18n();
  const [source, setSource] = useState<CropSource | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boxW, setBoxW] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setSource(null);
      setStatus('idle');
      return;
    }
    let alive = true;
    setStatus('loading');
    setErr('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    loadImageForCrop(file)
      .then((src) => {
        if (!alive) return;
        setSource(src);
        setStatus('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : 'Gagal memuat gambar. Coba file lain.');
        setStatus('error');
      });
    return () => { alive = false; };
  }, [open, file]);

  useEffect(() => {
    if (!open || !boxRef.current) return;
    const el = boxRef.current;
    const measure = () => setBoxW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, source]);

  const boxH = boxW / ratio;
  const view = source
    ? { boxW, boxH, zoom, offsetX: offset.x, offsetY: offset.y, imgW: source.width, imgH: source.height }
    : null;
  const layout = view ? cropLayout(view) : null;

  const setZoomClamped = (next: number) => {
    if (!source) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(z);
    const c = clampCropOffset({ boxW, boxH, zoom: z, imgW: source.width, imgH: source.height }, offset.x, offset.y);
    setOffset(c);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!source || status !== 'ready') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !source) return;
    const c = clampCropOffset(
      { boxW, boxH, zoom, imgW: source.width, imgH: source.height },
      d.ox + (e.clientX - d.x),
      d.oy + (e.clientY - d.y),
    );
    setOffset(c);
  };

  const endDrag = () => { drag.current = null; };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = () => {
    if (!source || !view || !layout) return;
    setBusy(true);
    setErr('');
    try {
      const dataUrl = exportCrop(source.canvas, view, maxDim, quality);
      onConfirm(dataUrl.split(',')[1]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal memotong gambar.');
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    onCancel();
  };

  return (
    <Modal open={open} onClose={close} title={t('Atur Foto')} wide>
      <div className="space-y-4">
        {err && <Alert>{t(err)}</Alert>}
        <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-xl border border-forest-700 bg-forest-900 select-none">
          <div
            ref={boxRef}
            className="relative w-full"
            style={{ aspectRatio: ratio, touchAction: 'none', cursor: status === 'ready' ? 'grab' : 'default' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {status === 'ready' && source && layout ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={source.previewUrl}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ width: layout.drawW, height: layout.drawH, left: layout.left, top: layout.top }}
              />
            ) : null}
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-moss">
                <Loader2 size={20} className="animate-spin" aria-hidden /> {t('Memuat foto…')}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/15" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="crop-zoom" className="flex items-center gap-1.5 text-sm font-semibold text-cream-dim">
              <ZoomIn size={15} aria-hidden /> {t('Ukuran')}
            </label>
            <button type="button" onClick={reset} disabled={status !== 'ready' || busy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-moss hover:text-cream cursor-pointer disabled:opacity-40">
              <RotateCcw size={13} aria-hidden /> {t('Reset Posisi')}
            </button>
          </div>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            disabled={status !== 'ready' || busy}
            className="!m-0 !w-full !border-0 !bg-transparent !p-0 accent-forest-400"
          />
          <p className="text-xs text-moss">{t('Geser foto untuk mengatur posisi, lalu atur ukurannya.')}</p>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={close} className="btn-ghost flex-1" disabled={busy}>{t('Batal')}</button>
          <button type="button" onClick={confirm} className="btn-primary flex-1" disabled={status !== 'ready' || busy}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
            {busy ? t('Memproses…') : t('Pakai Foto')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
