'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { compressImage } from '@/lib/image-client';
import { useI18n } from '@/lib/i18n';

export default function ImageUpload({ value, onChange, label = 'Foto', maxDim = 1000, quality = 0.82, aspect = 'aspect-[4/3]' }: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  maxDim?: number;
  quality?: number;
  aspect?: string;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file: File) => {
    setBusy(true);
    setErr('');
    try {
      const img = await compressImage(file, maxDim, quality);
      const res = await api<{ id: string }>('/api/staff/upload', 'POST', img);
      onChange(res.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal upload gambar.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const src = value ? `/api/img/${value}` : '';

  return (
    <div className="space-y-2">
      <span className="label">{label}</span>
      <div className={`relative ${aspect} max-w-xs rounded-lg overflow-hidden border border-forest-700 bg-forest-900`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="w-full h-full object-contain bg-white" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-moss">
            <ImagePlus size={24} aria-hidden />
            <span className="text-xs">{t('Belum ada gambar')}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-cream" aria-hidden />
          </div>
        )}
      </div>
      {err && <p className="text-xs text-red-300">{t(err)}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={t('Pilih file {label}', { label })}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost !min-h-[38px] !text-xs">
          <ImagePlus size={14} /> {value ? t('Ganti Gambar') : t('Pilih Gambar')}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} disabled={busy} className="btn-danger !min-h-[38px] !text-xs">
            <Trash2 size={14} /> {t('Hapus')}
          </button>
        )}
      </div>
      <p className="text-xs text-moss">{t('JPG/PNG/WebP, otomatis dikompres biar hemat & cepat.')}</p>
    </div>
  );
}