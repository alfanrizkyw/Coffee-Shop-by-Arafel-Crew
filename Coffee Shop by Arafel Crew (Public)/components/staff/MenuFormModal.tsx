'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { MenuItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { Alert, Modal } from '@/components/ui';
import ImageUpload from '@/components/staff/ImageUpload';

export default function MenuFormModal({ open, onClose, item, categories, onSaved }: {
  open: boolean;
  onClose: () => void;
  item: MenuItem | null;
  categories: string[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [nama, setNama] = useState(item?.nama ?? '');
  const [kategori, setKategori] = useState(item?.kategori ?? '');
  const [harga, setHarga] = useState(item ? String(item.harga) : '');
  const [deskripsi, setDeskripsi] = useState(item?.deskripsi ?? '');
  const [fotoId, setFotoId] = useState(item?.fotoId ?? '');
  const [tersedia, setTersedia] = useState(item?.tersedia ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const payload = {
        nama, kategori,
        harga: Number(harga),
        deskripsi, fotoId, tersedia,
        ...(item ? { expect: item.diubah } : {}),
      };
      if (item) await api(`/api/staff/menu/${item.id}`, 'PATCH', payload);
      else await api('/api/staff/menu', 'POST', payload);
      onSaved();
      onClose();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal menyimpan menu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? t('Edit Menu — {nama}', { nama: item.nama }) : t('Tambah Menu Baru')}>
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert>{t(err)}</Alert>}
        <div>
          <label htmlFor="mf-nama" className="label">{t('Nama Menu')}</label>
          <input id="mf-nama" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={60} required className="w-full" placeholder={t('Contoh: Kopi Susu Gula Aren')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mf-kategori" className="label">{t('Kategori')}</label>
            <input id="mf-kategori" list="mf-kategori-list" value={kategori} onChange={(e) => setKategori(e.target.value)} maxLength={30} required className="w-full" placeholder={t('Kopi')} />
            <datalist id="mf-kategori-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="mf-harga" className="label">{t('Harga (Rp)')}</label>
            <input id="mf-harga" type="number" inputMode="numeric" min={0} max={10000000} step={500} value={harga} onChange={(e) => setHarga(e.target.value)} required className="w-full" placeholder="18000" />
          </div>
        </div>
        <div>
          <label htmlFor="mf-deskripsi" className="label">{t('Deskripsi')}</label>
          <textarea id="mf-deskripsi" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} maxLength={300} rows={2} className="w-full resize-none" placeholder={t('Ceritakan singkat menu ini…')} />
        </div>
        <ImageUpload value={fotoId} onChange={setFotoId} label={t('Foto Menu')} />
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={tersedia} onChange={(e) => setTersedia(e.target.checked)} className="w-5 h-5 accent-forest-500" />
          <span className="text-sm font-semibold">{t('Tersedia (bisa dipesan)')}</span>
        </label>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={busy}>{t('Batal')}</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? t('Menyimpan…') : item ? t('Simpan Perubahan') : t('Tambah Menu')}</button>
        </div>
      </form>
    </Modal>
  );
}