'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, BellOff, ClipboardList, Coffee, QrCode, Check, X, Undo2, Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { jakartaTime, rupiah } from '@/lib/money';
import { playNewOrderBeep, unlockAudio } from '@/lib/sound';
import { AppSettings, MenuItem, Order, PAY_METHOD_LABEL, Role } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n } from '@/lib/i18n';
import { Alert, Confirm, EmptyState, Modal, Spinner } from '@/components/ui';
import { OrderStatusBadge, PayStatusBadge } from '@/components/StatusBadge';
import StaffShell from '@/components/staff/StaffShell';
import { useToast } from '@/components/Toast';

type FilterKey = 'aktif' | 'baru' | 'siap' | 'riwayat';

export default function KasirApp({ username, role }: { username: string; role: Role }) {
  const { t } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState('pesanan');
  const [filter, setFilter] = useState<FilterKey>('aktif');
  const [soundOn, setSoundOn] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [confirmState, setConfirmState] = useState<{ kind: 'batal' | 'lunas' | 'undo'; order: Order } | null>(null);
  const knownIds = useRef<Set<string> | null>(null);
  const soundRef = useRef(false);
  const { data: settingsData } = usePoll<{ settings: AppSettings }>('/api/staff/settings', 60000);
  const qrisId = settingsData?.settings.qrisId || '';

  useEffect(() => {
    const on = localStorage.getItem('ab_sound') === '1';
    setSoundOn(on);
    soundRef.current = on;
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const { data, error, loading, refresh } = usePoll<{ orders: Order[] }>('/api/staff/orders', 5000, (d) => {
    const orders = d.orders;
    if (knownIds.current === null) {
      knownIds.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !knownIds.current!.has(o.id));
    for (const o of orders) knownIds.current!.add(o.id);
    const newActive = fresh.filter((o) => o.status === 'baru');
    if (newActive.length > 0) {
      if (soundRef.current) playNewOrderBeep();
      toast(t('Pesanan baru: {codes}', { codes: newActive.map((o) => o.kode).join(', ') }), 'info');
    }
  });

  const orderList = data?.orders ?? [];
  const newCount = orderList.filter((o) => o.status === 'baru').length;

  useEffect(() => {
    document.title = newCount > 0 ? t('({n}) Pesanan Baru — Kasir Area Barat', { n: newCount }) : t('Kasir — Area Barat');
  }, [newCount, t]);

  const counts = useMemo(() => ({
    aktif: orderList.filter((o) => ['baru', 'diproses', 'siap'].includes(o.status)).length,
    baru: newCount,
    siap: orderList.filter((o) => o.status === 'siap').length,
    riwayat: orderList.filter((o) => ['selesai', 'batal'].includes(o.status)).length,
  }), [orderList, newCount]);

  const shown = useMemo(() => {
    const byFilter: Record<FilterKey, (o: Order) => boolean> = {
      aktif: (o) => ['baru', 'diproses', 'siap'].includes(o.status),
      baru: (o) => o.status === 'baru',
      siap: (o) => o.status === 'siap',
      riwayat: (o) => ['selesai', 'batal'].includes(o.status),
    };
    return orderList.filter(byFilter[filter]).sort((a, b) => {
      if (filter === 'riwayat') return b.diubah.localeCompare(a.diubah);
      return a.dibuat.localeCompare(b.dibuat);
    });
  }, [orderList, filter]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    localStorage.setItem('ab_sound', next ? '1' : '0');
    if (next) { unlockAudio(); playNewOrderBeep(); }
  };

  const patchOrder = async (order: Order, patch: Record<string, string>) => {
    setBusyId(order.id);
    try {
      await api(`/api/staff/orders/${order.id}`, 'PATCH', { ...patch, expect: order.diubah });
      toast(t('{kode} diperbarui.', { kode: order.kode }), 'ok');
      setPayOrder(null);
      setConfirmState(null);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal memperbarui pesanan.', 'error');
      setPayOrder(null);
      setConfirmState(null);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const doConfirm = () => {
    if (!confirmState) return;
    const { kind, order } = confirmState;
    if (kind === 'batal') patchOrder(order, { status: 'batal' });
    else if (kind === 'lunas') patchOrder(order, { statusBayar: 'lunas' });
    else patchOrder(order, { statusBayar: 'belum_bayar' });
  };

  return (
    <StaffShell
      username={username}
      role={role}
      title="Panel Kasir"
      nav={[
        { key: 'pesanan', label: 'Pesanan', icon: ClipboardList },
        { key: 'menu', label: 'Ketersediaan Menu', icon: Coffee },
      ]}
      active={tab}
      onNav={setTab}
      alertCount={newCount}
    >
      {tab === 'pesanan' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['aktif', 'baru', 'siap', 'riwayat'] as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`chip capitalize ${filter === f ? 'bg-forest-600 border-forest-500 text-white' : 'bg-forest-850 border-forest-750 text-cream-dim hover:bg-forest-800'}`}
                aria-pressed={filter === f}
              >
                {t(f)} <span className="tabular-nums">({counts[f]})</span>
              </button>
            ))}
            <button onClick={toggleSound} className={`chip ml-auto ${soundOn ? 'bg-ok/15 border-ok/50 text-green-300' : 'bg-forest-850 border-forest-750 text-moss'}`} aria-pressed={soundOn}>
              {soundOn ? <Bell size={14} aria-hidden /> : <BellOff size={14} aria-hidden />}
              {soundOn ? t('Suara Aktif') : t('Aktifkan Suara')}
            </button>
          </div>

          {error && <Alert tone="warn">{t('Koneksi terganggu: {error}. Mencoba lagi otomatis…', { error: t(error) })}</Alert>}
          {loading ? (
            <Spinner label="Memuat pesanan…" />
          ) : shown.length === 0 ? (
            <EmptyState title="Tidak ada pesanan di sini" desc="Pesanan baru dari pelanggan muncul otomatis tanpa refresh." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {shown.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  busy={busyId === o.id}
                  onStatus={(s) => patchOrder(o, { status: s })}
                  onAskLunas={() => setConfirmState({ kind: 'lunas', order: o })}
                  onAskBatal={() => setConfirmState({ kind: 'batal', order: o })}
                  onAskUndo={() => setConfirmState({ kind: 'undo', order: o })}
                  onShowQris={() => setPayOrder(o)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <MenuAvailability />
      )}

      <QrisPayModal
        order={payOrder}
        qrisId={qrisId}
        busy={!!busyId && busyId === payOrder?.id}
        onClose={() => setPayOrder(null)}
        onLunas={(o) => patchOrder(o, { statusBayar: 'lunas' })}
      />

      <Confirm
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={doConfirm}
        title={confirmState?.kind === 'batal' ? 'Batalkan pesanan?' : confirmState?.kind === 'lunas' ? 'Tandai lunas?' : 'Batalkan status lunas?'}
        desc={
          confirmState?.kind === 'batal'
            ? t('Pesanan {kode} akan dibatalkan dan pelanggan melihat statusnya.', { kode: confirmState.order.kode })
            : confirmState?.kind === 'lunas'
              ? t('Pastikan uang {total} benar-benar sudah diterima di meja kasir (tunai/QRIS).', { total: rupiah(confirmState?.order.total ?? 0) })
              : t('Status lunas {kode} akan dikembalikan ke belum bayar. Gunakan hanya jika salah pencet.', { kode: confirmState?.order.kode ?? '' })
        }
        confirmLabel={confirmState?.kind === 'batal' ? 'Ya, Batalkan' : confirmState?.kind === 'lunas' ? 'Ya, Sudah Terima' : 'Ya, Kembalikan'}
        danger={confirmState?.kind !== 'lunas'}
        busy={!!busyId}
      />
    </StaffShell>
  );
}

function QrisPayModal({ order, qrisId, busy, onClose, onLunas }: {
  order: Order | null;
  qrisId: string;
  busy: boolean;
  onClose: () => void;
  onLunas: (o: Order) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal open={!!order} onClose={onClose} title={t('Bayar QRIS — {kode}', { kode: order?.kode ?? '' })}>
      {order && (
        <div className="space-y-4 text-center">
          <div>
            <p className="text-xs text-moss uppercase tracking-widest">{t('Nominal tagihan')}</p>
            <p className="font-display text-4xl font-bold text-wood-300 tabular-nums mt-1">{rupiah(order.total)}</p>
            <p className="text-sm text-cream-dim mt-1">{order.nama} · {t('Meja {meja}', { meja: order.meja })}</p>
          </div>
          {qrisId ? (
            <div className="rounded-xl bg-white p-3 w-fit mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/img/${qrisId}`} alt={t('QR QRIS Area Barat')} className="w-52 h-52 sm:w-60 sm:h-60 object-contain" />
            </div>
          ) : (
            <Alert tone="warn">{t('QR QRIS belum diunggah. Minta Bos upload di Panel Bos → QRIS, atau terima pembayaran tunai.')}</Alert>
          )}
          <p className="text-xs text-moss text-left">{t('Tunjukkan layar ini ke pembeli untuk discan. Pastikan nominal yang masuk sesuai, lalu cek mutasi QRIS kedai sebelum konfirmasi.')}</p>
          <button onClick={() => onLunas(order)} disabled={busy} className="btn-primary w-full">
            <Check size={16} aria-hidden /> {busy ? t('Memproses…') : t('Konfirmasi Lunas')}
          </button>
        </div>
      )}
    </Modal>
  );
}

function OrderCard({ order: o, busy, onStatus, onAskLunas, onAskBatal, onAskUndo, onShowQris }: {
  order: Order;
  busy: boolean;
  onStatus: (s: string) => void;
  onAskLunas: () => void;
  onAskBatal: () => void;
  onAskUndo: () => void;
  onShowQris: () => void;
}) {
  const { t } = useI18n();
  const active = ['baru', 'diproses', 'siap'].includes(o.status);
  return (
    <div className={`card p-4 flex flex-col gap-3 ${o.status === 'baru' ? 'border-wood-400/60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display font-bold text-lg leading-none">{o.kode}</p>
          <p className="text-xs text-moss mt-1">{jakartaTime(o.dibuat)} · {o.nama} · {t('Meja {meja}', { meja: o.meja })}</p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>

      <ul className="text-sm space-y-1">
        {o.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="text-cream-dim"><span className="font-bold text-cream">{it.qty}×</span> {it.nama}</span>
            <span className="tabular-nums text-moss text-xs whitespace-nowrap">{rupiah(it.harga * it.qty)}</span>
          </li>
        ))}
      </ul>
      {o.catatan && <p className="text-xs bg-wood-400/10 border border-wood-400/30 text-wood-300 rounded-md px-2.5 py-1.5">{t('Catatan')}: {o.catatan}</p>}

      <div className="flex items-center justify-between border-t border-forest-750 pt-2.5">
        <span className="font-bold text-wood-300 tabular-nums">{rupiah(o.total)}</span>
        <span className="text-xs text-moss">{t(PAY_METHOD_LABEL[o.metode])}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PayStatusBadge status={o.statusBayar} />
        {o.metode === 'qris' && o.statusBayar === 'belum_bayar' && active && (
          <button onClick={onShowQris} disabled={busy} className="btn-wood !min-h-[36px] !px-2.5 !py-1 !text-xs">
            <QrCode size={13} aria-hidden /> {t('Tunjukkan QRIS')}
          </button>
        )}
        {o.statusBayar === 'belum_bayar' && active && (
          <button onClick={onAskLunas} disabled={busy} className="btn-ghost !min-h-[36px] !px-2.5 !py-1 !text-xs">
            <Check size={13} aria-hidden /> {t('Tandai Lunas')}
          </button>
        )}
        {o.statusBayar === 'lunas' && active && (
          <button onClick={onAskUndo} disabled={busy} className="text-moss hover:text-cream p-1.5 cursor-pointer" aria-label={t('Batalkan status lunas')} title={t('Salah pencet? Kembalikan ke belum bayar')}>
            <Undo2 size={13} />
          </button>
        )}
      </div>

      {active && (
        <div className="flex gap-2 mt-auto">
          {o.status === 'baru' && (
            <button onClick={() => onStatus('diproses')} disabled={busy} className="btn-primary flex-1 !text-xs">{t('Proses')}</button>
          )}
          {o.status === 'diproses' && (
            <button onClick={() => onStatus('siap')} disabled={busy} className="btn-wood flex-1 !text-xs">{t('Siap')}</button>
          )}
          {o.status === 'siap' && (
            <>
              <button onClick={() => onStatus('diproses')} disabled={busy} className="btn-ghost !text-xs !px-3" title={t('Kembalikan ke diproses')}>←</button>
              <button
                onClick={() => onStatus('selesai')}
                disabled={busy || o.statusBayar !== 'lunas'}
                className="btn-primary flex-1 !text-xs"
                title={o.statusBayar !== 'lunas' ? t('Konfirmasi pembayaran di kasir dulu sebelum menyelesaikan') : undefined}
              >
                {t('Selesaikan')}
              </button>
            </>
          )}
          {o.status !== 'siap' && (
            <button onClick={onAskBatal} disabled={busy} className="btn-danger !text-xs !px-3" aria-label={t('Batalkan {kode}', { kode: o.kode })}>
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {busy && <p className="text-xs text-moss text-center">{t('Memperbarui…')}</p>}
    </div>
  );
}

function MenuAvailability() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error, loading, refresh } = usePoll<{ menu: MenuItem[] }>('/api/staff/menu', 20000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const toggle = async (m: MenuItem) => {
    setBusyId(m.id);
    try {
      await api(`/api/staff/menu/${m.id}`, 'PATCH', { tersedia: !m.tersedia, expect: m.diubah });
      toast(t('{nama} → {status}', { nama: m.nama, status: t(m.tersedia ? 'Habis' : 'Tersedia') }), 'ok');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal mengubah ketersediaan.', 'error');
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const menu = (data?.menu ?? []).filter((m) => !query || m.nama.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-moss">{t('Matikan menu yang habis — pelanggan langsung melihat label "Habis" dan tidak bisa memesannya.')}</p>
      {error && <Alert tone="warn">{t(error)}</Alert>}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Cari menu…')} className="w-full !pl-9" aria-label={t('Cari menu')} />
      </div>
      {loading ? <Spinner /> : menu.length === 0 ? (
        <EmptyState title="Belum ada menu" desc="Bos bisa menambah menu di Panel Bos." />
      ) : (
        <div className="space-y-2">
          {menu.map((m) => (
            <div key={m.id} className="card !rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{m.nama}</p>
                <p className="text-xs text-moss">{m.kategori} · {rupiah(m.harga)}</p>
              </div>
              <span className={`text-xs font-semibold ${m.tersedia ? 'text-green-300' : 'text-red-300'}`}>
                {m.tersedia ? t('Tersedia') : t('Habis')}
              </span>
              <button
                role="switch"
                aria-checked={m.tersedia}
                aria-label={t('Ketersediaan {nama}', { nama: m.nama })}
                onClick={() => toggle(m)}
                disabled={busyId === m.id}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${m.tersedia ? 'bg-forest-500' : 'bg-forest-750'} disabled:opacity-50`}
              >
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-cream transition-all duration-200 ${m.tersedia ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}