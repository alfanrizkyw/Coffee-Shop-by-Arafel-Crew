'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Coffee, Pencil, Plus, QrCode, Search, Trash2, Save, Users, Wifi } from 'lucide-react';
import { api } from '@/lib/api-client';
import { rupiah } from '@/lib/money';
import { AppSettings, MenuItem, Role } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n } from '@/lib/i18n';
import { Alert, Confirm, EmptyState, Spinner } from '@/components/ui';
import StaffShell from '@/components/staff/StaffShell';
import MenuFormModal from '@/components/staff/MenuFormModal';
import ImageUpload from '@/components/staff/ImageUpload';
import ReportsView from '@/components/staff/ReportsView';
import AccountsManager from '@/components/staff/AccountsManager';
import { useToast } from '@/components/Toast';

export default function BosApp({ username, role }: { username: string; role: Role }) {
  const [tab, setTab] = useState('menu');
  return (
    <StaffShell
      username={username}
      role={role}
      title="Panel Bos"
      nav={[
        { key: 'menu', label: 'Kelola Menu', icon: Coffee },
        { key: 'qris', label: 'QRIS & Kedai', icon: QrCode },
        { key: 'laporan', label: 'Laporan', icon: BarChart3 },
        { key: 'akun', label: 'Akun Staff', icon: Users },
      ]}
      active={tab}
      onNav={setTab}
    >
      {tab === 'menu' && <MenuManager />}
      {tab === 'qris' && <QrisSettings />}
      {tab === 'laporan' && <ReportsView />}
      {tab === 'akun' && <AccountsManager username={username} />}
    </StaffShell>
  );
}

function MenuManager() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error, loading, refresh } = usePoll<{ menu: MenuItem[] }>('/api/staff/menu', 30000);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const menu = data?.menu ?? [];
  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.kategori))).sort(), [menu]);
  const shown = menu
    .filter((m) => !query || m.nama.toLowerCase().includes(query.toLowerCase()) || m.kategori.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.kategori.localeCompare(b.kategori) || a.nama.localeCompare(b.nama));

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/staff/menu/${deleting.id}`, 'DELETE');
      toast(t('Menu "{nama}" dihapus. Riwayat pesanan lama tetap aman.', { nama: deleting.nama }), 'ok');
      setDeleting(null);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menghapus menu.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Cari menu / kategori…')} className="w-full !pl-9" aria-label={t('Cari menu')} />
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
          <Plus size={16} /> {t('Tambah Menu')}
        </button>
      </div>

      {error && <Alert tone="warn">{t(error)}</Alert>}
      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState title="Belum ada menu" desc="Klik Tambah Menu untuk membuat menu pertama lengkap dengan foto dan deskripsi." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((m) => (
            <div key={m.id} className="card overflow-hidden flex flex-col">
              <div className="aspect-[16/9] bg-forest-800 relative">
                {m.fotoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/img/${m.fotoId}`} alt={m.nama} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-moss"><Coffee size={28} aria-hidden /></div>
                )}
                <span className={`absolute top-2 left-2 badge ${m.tersedia ? 'bg-ok/90 text-white' : 'bg-danger/90 text-white'}`}>
                  {m.tersedia ? t('Tersedia') : t('Habis')}
                </span>
              </div>
              <div className="p-3.5 flex flex-col gap-1 flex-1">
                <p className="font-display font-semibold">{m.nama}</p>
                <p className="text-xs text-moss">{m.kategori} · <span className="text-wood-300 font-bold">{rupiah(m.harga)}</span></p>
                {m.deskripsi && <p className="text-xs text-cream-dim line-clamp-2">{m.deskripsi}</p>}
                <div className="flex gap-2 mt-auto pt-2.5">
                  <button onClick={() => { setEditing(m); setFormOpen(true); }} className="btn-ghost flex-1 !min-h-[38px] !text-xs">
                    <Pencil size={13} /> {t('Edit')}
                  </button>
                  <button onClick={() => setDeleting(m)} className="btn-danger !min-h-[38px] !text-xs !px-3" aria-label={t('Hapus {nama}', { nama: m.nama })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <MenuFormModal
          key={editing?.id ?? 'new'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          item={editing}
          categories={categories}
          onSaved={() => { toast(editing ? 'Menu diperbarui.' : 'Menu baru ditambahkan.', 'ok'); refresh(); }}
        />
      )}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        title="Hapus menu?"
        desc={t('"{nama}" akan hilang dari daftar pelanggan. Riwayat pesanan yang sudah ada tidak berubah. Kalau hanya sementara habis, lebih baik tandai "Habis" saja lewat edit.', { nama: deleting?.nama ?? '' })}
        confirmLabel="Ya, Hapus"
        danger
        busy={deleteBusy}
      />
    </div>
  );
}

function QrisSettings() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error, loading, refresh } = usePoll<{ settings: AppSettings }>('/api/staff/settings', 60000);
  const [savingQris, setSavingQris] = useState(false);
  const [namaKedai, setNamaKedai] = useState<string | null>(null);
  const [pengumuman, setPengumuman] = useState<string | null>(null);
  const [wifiNama, setWifiNama] = useState<string | null>(null);
  const [wifiSandi, setWifiSandi] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveSetting = async (key: string, value: string) => {
    await api('/api/staff/settings', 'PUT', { key, value });
  };

  const changeQris = async (id: string) => {
    setSavingQris(true);
    try {
      await saveSetting('qrisId', id);
      toast(id ? 'QRIS berhasil diganti. Pelanggan langsung melihat QR baru.' : 'QRIS dihapus — pelanggan hanya bisa bayar tunai.', 'ok');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal menyimpan QRIS.', 'error');
    } finally {
      setSavingQris(false);
    }
  };

  const saveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (namaKedai !== null) await saveSetting('namaKedai', namaKedai.trim());
      if (pengumuman !== null) await saveSetting('pengumuman', pengumuman.trim());
      if (wifiNama !== null) await saveSetting('wifiNama', wifiNama.trim());
      if (wifiSandi !== null) await saveSetting('wifiSandi', wifiSandi.trim());
      toast('Profil kedai disimpan.', 'ok');
      setNamaKedai(null);
      setPengumuman(null);
      setWifiNama(null);
      setWifiSandi(null);
      refresh();
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Gagal menyimpan.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  const s = data?.settings;

  return (
    <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
      <div className="card p-5 space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><QrCode size={18} aria-hidden /> {t('QR QRIS Pembayaran')}</h2>
        <p className="text-sm text-moss">{t('QR ini ditampilkan ke pelanggan yang memilih bayar QRIS. Upload foto/screenshot QR QRIS statis kedai kamu.')}</p>
        {error && <Alert tone="warn">{t(error)}</Alert>}
        {s && (
          <ImageUpload
            value={s.qrisId}
            onChange={changeQris}
            label={t('QR QRIS aktif')}
            maxDim={1200}
            quality={0.9}
            aspect="aspect-square"
          />
        )}
        {savingQris && <p className="text-xs text-moss">{t('Menyimpan QRIS…')}</p>}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-bold text-lg mb-3">{t('Profil Kedai')}</h2>
        {s && (
          <form onSubmit={saveProfil} className="space-y-4">
            <div>
              <label htmlFor="nk" className="label">{t('Nama Kedai')}</label>
              <input id="nk" value={namaKedai ?? s.namaKedai} onChange={(e) => setNamaKedai(e.target.value)} maxLength={80} className="w-full" />
            </div>
            <div>
              <label htmlFor="pg" className="label">{t('Pengumuman (tampil di halaman pelanggan)')}</label>
              <textarea id="pg" value={pengumuman ?? s.pengumuman} onChange={(e) => setPengumuman(e.target.value)} maxLength={200} rows={3} className="w-full resize-none" placeholder={t('Contoh: Promo Jumat! Diskon semua kopi 20%')} />
              <p className="text-xs text-moss mt-1">{t('Kosongkan untuk menyembunyikan pengumuman.')}</p>
            </div>
            <div className="space-y-3 rounded-lg border border-forest-750 p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-cream"><Wifi size={15} aria-hidden /> {t('WiFi untuk pelanggan')}</p>
              <div>
                <label htmlFor="wn" className="label">{t('Nama WiFi')}</label>
                <input id="wn" value={wifiNama ?? s.wifiNama} onChange={(e) => setWifiNama(e.target.value)} maxLength={32} className="w-full" placeholder={t('Contoh: Area Barat Guest')} autoComplete="off" spellCheck={false} />
              </div>
              <div>
                <label htmlFor="ws" className="label">{t('Sandi WiFi')}</label>
                <input id="ws" value={wifiSandi ?? s.wifiSandi} onChange={(e) => setWifiSandi(e.target.value)} maxLength={63} className="w-full" placeholder={t('Contoh: kopihutan123')} autoComplete="off" spellCheck={false} />
                <p className="text-xs text-moss mt-1">{t('Nama dan sandi tampil di halaman pelanggan. Kosongkan nama WiFi untuk menyembunyikan.')}</p>
              </div>
            </div>
            <button type="submit" disabled={busy || (namaKedai === null && pengumuman === null && wifiNama === null && wifiSandi === null)} className="btn-primary">
              <Save size={15} /> {busy ? t('Menyimpan…') : t('Simpan Profil')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}