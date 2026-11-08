'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Banknote, Bell, BellOff, BellRing, Check, ChefHat, Clock, ImageDown, Loader2, Printer, QrCode, ReceiptText, Send, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { jakartaDateTime, jakartaTime, rupiah } from '@/lib/money';
import { saveReceiptPhoto } from '@/lib/receipt-image';
import { playReadyChime, unlockAudio } from '@/lib/sound';
import { Order, OrderStatus, PAY_METHOD_LABEL, PublicData, Review } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n, LangToggle } from '@/lib/i18n';
import { Alert, Confirm, Spinner } from '@/components/ui';
import { PayStatusBadge } from '@/components/StatusBadge';
import { Stars, StarInput } from '@/components/Stars';
import { useToast } from '@/components/Toast';

const STEPS: { key: OrderStatus; label: string; icon: typeof Clock; hint: string }[] = [
  { key: 'baru', label: 'Diterima', icon: ReceiptText, hint: 'Pesanan masuk ke kasir' },
  { key: 'diproses', label: 'Dibuat', icon: ChefHat, hint: 'Barista sedang meracik' },
  { key: 'siap', label: 'Siap', icon: BellRing, hint: 'Ambil & bayar di kasir' },
  { key: 'selesai', label: 'Selesai', icon: Check, hint: 'Selamat menikmati!' },
];

export default function TrackOrder({ token }: { token: string }) {
  const toast = useToast();
  const { t, lang } = useI18n();
  const { data, error, loading, refresh } = usePoll<{ order: Order; review: Review | null }>(`/api/public/orders/${token}`, 4000);
  const { data: pub } = usePoll<PublicData>('/api/public/data', 60000);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [acked, setAcked] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewErr, setReviewErr] = useState('');
  const [reviewDone, setReviewDone] = useState<Review | null>(null);
  const soundRef = useRef(true);
  const prevStatus = useRef<OrderStatus | null>(null);

  const order = data?.order;
  const status = order?.status;
  const namaKedai = pub?.settings.namaKedai || 'Area Barat';
  const ackKey = `ab_ready_ack_${token}`;
  const existingReview = reviewDone || data?.review || null;

  useEffect(() => {
    const on = localStorage.getItem('ab_track_sound') !== '0';
    soundRef.current = on;
    setSoundOn(on);
    setAcked(localStorage.getItem(`ab_ready_ack_${token}`) === '1');
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [token]);

  useEffect(() => {
    if (!order) return;
    localStorage.setItem('ab_last_token', token);
    if (prevStatus.current && prevStatus.current !== order.status) {
      if (order.status === 'diproses') toast('Pesananmu sedang dibuat barista.', 'info');
      else if (order.status === 'batal') toast('Pesanan dibatalkan.', 'error');
      else if (order.status === 'selesai') toast('Pesanan selesai. Terima kasih!', 'ok');
    }
    if (order.status !== 'siap') {
      localStorage.removeItem(`ab_ready_ack_${token}`);
      setAcked(false);
    }
    prevStatus.current = order.status;
  }, [order, token, toast]);

  useEffect(() => {
    if (status !== 'siap' || acked) return;
    const fire = () => {
      if (soundRef.current) playReadyChime();
      if (navigator.userActivation?.hasBeenActive) { try { navigator.vibrate?.(150); } catch { /* tidak didukung */ } }
    };
    fire();
    const iv = setInterval(() => { if (!document.hidden) fire(); }, 6000);
    return () => clearInterval(iv);
  }, [status, acked]);

  useEffect(() => {
    if (status === 'siap') document.title = t('SIAP! Ambil & bayar di kasir — Area Barat');
    else if (status === 'selesai') document.title = t('Selesai — Area Barat');
    else document.title = t('Lacak Pesanan — Area Barat');
    return () => { document.title = 'Area Barat'; };
  }, [status, t]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    localStorage.setItem('ab_track_sound', next ? '1' : '0');
    if (next) { unlockAudio(); playReadyChime(); }
    toast(next ? 'Alarm siap dinyalakan.' : 'Alarm siap dimatikan.', 'info');
  };

  const ackReady = () => {
    setAcked(true);
    localStorage.setItem(ackKey, '1');
    if (navigator.userActivation?.hasBeenActive) { try { navigator.vibrate?.(0); } catch { /* tidak didukung */ } }
    toast('Alarm dimatikan. Selamat menikmati!', 'ok');
  };

  const savePhoto = async () => {
    if (!order) return;
    setPhotoBusy(true);
    try {
      const result = await saveReceiptPhoto(order, namaKedai, lang);
      toast(result === 'shared' ? 'Nota dibagikan — simpan ke galeri.' : 'Nota diunduh sebagai foto (PNG).', 'ok');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal membuat foto nota.', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const submitReview = async () => {
    if (rating < 1) { setReviewErr('Pilih rating bintang dulu ya.'); return; }
    setReviewBusy(true);
    setReviewErr('');
    try {
      const { review } = await api<{ review: Review }>(`/api/public/orders/${token}/review`, 'POST', { rating, komentar: komentar.trim() });
      setReviewDone(review);
      toast('Terima kasih atas ulasanmu!', 'ok');
      refresh();
    } catch (e) {
      setReviewErr(e instanceof Error ? e.message : 'Gagal mengirim ulasan.');
    } finally {
      setReviewBusy(false);
    }
  };

  const cancel = async () => {
    setCancelBusy(true);
    try {
      await api(`/api/public/orders/${token}/cancel`, 'POST', {});
      toast('Pesanan dibatalkan.', 'info');
      setCancelOpen(false);
      refresh();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Gagal membatalkan.');
      setCancelOpen(false);
    } finally {
      setCancelBusy(false);
    }
  };

  if (loading) {
    return <main className="min-h-dvh flex items-center justify-center"><Spinner label="Memuat pesanan…" /></main>;
  }
  if (!order) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <div className="card p-6 max-w-md w-full text-center space-y-4">
          <XCircle size={32} className="text-danger mx-auto" aria-hidden />
          <p className="font-display font-bold">{t('Pesanan tidak ditemukan')}</p>
          <p className="text-sm text-moss">{t(error || 'Link pesanan tidak valid.')}</p>
          <Link href="/" className="btn-primary w-full">{t('Kembali ke Menu')}</Link>
        </div>
      </main>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const cancelled = order.status === 'batal';

  return (
    <>
      <main className="min-h-dvh pb-16 print:hidden">
        <header className="glass border-b border-forest-800">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between gap-2">
            <Link href="/" className="chip border-forest-700 bg-forest-850 text-cream-dim hover:bg-forest-800" aria-label={t('Kembali ke Menu')}>
              <ArrowLeft size={14} aria-hidden /> <span className="hidden sm:inline">{t('Menu')}</span>
            </Link>
            <Image src="/logo.webp" alt="Area Barat" width={140} height={53} sizes="112px" className="hidden min-[360px]:block w-20 sm:w-28 h-auto" priority />
            <div className="flex items-center gap-2">
              <LangToggle />
              <button
                onClick={toggleSound}
                className={`chip ${soundOn ? 'border-ok/50 text-green-300' : 'border-forest-700 text-moss'}`}
                aria-pressed={soundOn}
                aria-label={soundOn ? t('Matikan alarm pesanan siap') : t('Nyalakan alarm pesanan siap')}
              >
                {soundOn ? <Bell size={14} aria-hidden /> : <BellOff size={14} aria-hidden />}
                <span className="hidden sm:inline">{soundOn ? t('Alarm ON') : t('Alarm OFF')}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {error && <Alert tone="warn">{t('Koneksi terganggu: {error}. Mencoba lagi otomatis…', { error: t(error) })}</Alert>}
          {actionErr && <Alert>{t(actionErr)}</Alert>}

          <div className="card p-5 text-center anim-fade-up">
            <p className="text-moss text-xs uppercase tracking-widest mb-1">{t('Kode Pesanan')}</p>
            <p className="font-display text-3xl font-bold text-wood-300">{order.kode}</p>
            <p className="text-sm text-cream-dim mt-1">{order.nama} · {t('Meja {meja}', { meja: order.meja })} · {jakartaTime(order.dibuat)}</p>
          </div>

          {cancelled ? (
            <div className="card p-5 border-danger/40 text-center space-y-2 anim-fade-up">
              <XCircle size={28} className="text-danger mx-auto" aria-hidden />
              <p className="font-display font-bold text-red-300">{t('Pesanan Dibatalkan')}</p>
              <p className="text-sm text-moss">{t('Kalau sudah terlanjur bayar, hubungi kasir ya.')}</p>
              <Link href="/" className="btn-primary w-full mt-2">{t('Pesan Lagi')}</Link>
            </div>
          ) : (
            <>
              {order.status === 'siap' && (
                <div className="ready-banner glass rounded-xl border border-ok/60 bg-ok/15 p-5 text-center space-y-2" role="alert">
                  <BellRing size={28} className={`text-green-300 mx-auto ${!acked ? 'anim-ring' : ''}`} aria-hidden />
                  <p className="font-display font-bold text-green-300 text-xl">{t('Pesananmu SIAP!')}</p>
                  <p className="text-sm text-cream">
                    {t('Ambil di kasir dan bayar')} <span className="font-bold text-wood-300">{rupiah(order.total)}</span> ({t(PAY_METHOD_LABEL[order.metode])}).
                  </p>
                  <p className="text-xs text-moss">{t('Tunjukkan kode')} <span className="font-bold text-cream">{order.kode}</span> {t('ke kasir.')}</p>
                  {!acked && (
                    <>
                      <button onClick={ackReady} className="btn-wood w-full mt-1"><Check size={16} aria-hidden /> {t('Oke, Saya Ambil')}</button>
                      <p className="text-[11px] text-moss">{t('Alarm berbunyi terus sampai kamu menekan tombol di atas.')}</p>
                    </>
                  )}
                  {acked && <p className="text-xs text-green-300 flex items-center justify-center gap-1.5 pt-1"><Check size={14} aria-hidden /> {t('Alarm dimatikan.')}</p>}
                </div>
              )}
              {order.status === 'selesai' && (
                <div className="glass rounded-xl border border-forest-600 bg-forest-800 p-5 text-center space-y-3 anim-fade-up">
                  <Check size={26} className="text-forest-300 mx-auto" aria-hidden />
                  <p className="font-display font-bold">{t('Selesai — selamat menikmati!')}</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={savePhoto} disabled={photoBusy} className="btn-wood justify-center">
                      {photoBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImageDown size={16} aria-hidden />} {photoBusy ? t('Membuat…') : t('Simpan Nota')}
                    </button>
                    <button onClick={() => window.print()} className="btn-ghost justify-center"><Printer size={16} aria-hidden /> {t('Cetak')}</button>
                  </div>
                  <p className="text-[11px] text-moss">{t('Nota disimpan sebagai foto PNG yang rapi — langsung masuk galeri.')}</p>
                  <Link href="/" className="btn-ghost w-full justify-center">{t('Pesan Lagi')}</Link>
                </div>
              )}

              <div className="card p-5 anim-fade-up" style={{ animationDelay: '60ms' }} aria-label={t('Status pesanan')}>
                <ol className="space-y-0">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const done = i < stepIndex || order.status === 'selesai';
                    const current = i === stepIndex && order.status !== 'selesai';
                    return (
                      <li key={s.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 ${done ? 'bg-forest-600 border-forest-500 text-white' : current ? 'border-wood-400 text-wood-300 bg-wood-400/10' : 'border-forest-700 text-moss'}`}>
                            <Icon size={16} aria-hidden />
                          </span>
                          {i < STEPS.length - 1 && <span className={`w-0.5 flex-1 min-h-[20px] ${done ? 'bg-forest-500' : 'bg-forest-750'}`} aria-hidden />}
                        </div>
                        <div className={`pb-4 ${current ? '' : done ? '' : 'opacity-50'}`}>
                          <p className={`font-semibold text-sm ${current ? 'text-wood-300' : ''}`}>{t(s.label)}{current && ` — ${t('sekarang')}`}</p>
                          <p className="text-xs text-moss">{t(s.hint)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="text-xs text-moss border-t border-forest-750 pt-3">{t('Halaman ini update otomatis — tidak perlu refresh atau bolak-balik ke kasir.')}</p>
              </div>
            </>
          )}

            <div className="card p-5 space-y-3 anim-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold">{t('Pembayaran')}</h2>
                <PayStatusBadge status={order.statusBayar} />
              </div>
              <p className="text-sm text-cream-dim">{t('Metode')}: <span className="font-semibold text-cream">{t(PAY_METHOD_LABEL[order.metode])}</span> · {t('Total')}: <span className="font-bold text-wood-300">{rupiah(order.total)}</span></p>

              {cancelled ? null : order.statusBayar === 'lunas' ? (
                <p className="text-sm text-green-300 flex items-center gap-2"><Check size={14} aria-hidden /> {t('Pembayaran lunas. Terima kasih!')}</p>
              ) : (
                <div className="rounded-lg border border-forest-700 bg-forest-850 p-4 space-y-2">
                  <p className="text-sm font-semibold text-cream flex items-center gap-2">
                    {order.metode === 'qris' ? <QrCode size={16} className="text-wood-300 shrink-0" aria-hidden /> : <Banknote size={16} className="text-wood-300 shrink-0" aria-hidden />}
                    {t('Semua pembayaran di meja kasir')}
                  </p>
                  {order.metode === 'qris' ? (
                    <p className="text-xs text-moss">{t('Saat pesanan siap, kasir akan menunjukkan QR QRIS dan nominal {total}. Scan di kasir, lalu kasir mengonfirmasi pembayaranmu.', { total: rupiah(order.total) })}</p>
                  ) : (
                    <p className="text-xs text-moss">{t('Siapkan uang {total} — bayar langsung ke kasir saat mengambil pesanan.', { total: rupiah(order.total) })}</p>
                  )}
                </div>
              )}
            </div>

            <div className="card p-5 anim-fade-up" style={{ animationDelay: '180ms' }}>
              <h2 className="font-display font-bold mb-3">{t('Rincian Pesanan')}</h2>
            <div className="space-y-2">
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-cream-dim">{it.qty}× {it.nama}</span>
                  <span className="tabular-nums">{rupiah(it.harga * it.qty)}</span>
                </div>
              ))}
              {order.catatan && <p className="text-xs text-moss border-t border-forest-750 pt-2">{t('Catatan')}: {order.catatan}</p>}
              <div className="flex justify-between font-bold border-t border-forest-750 pt-2">
                <span>{t('Total')}</span>
                <span className="text-wood-300 tabular-nums">{rupiah(order.total)}</span>
              </div>
            </div>
          </div>

          {order.status === 'selesai' && (
            <div className="glass card p-5 space-y-3 anim-fade-up" style={{ animationDelay: '220ms' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold">{t('Ulasan Kamu')}</h2>
                {existingReview && <Stars value={existingReview.rating} size={15} />}
              </div>
              {existingReview ? (
                <div className="space-y-2">
                  {existingReview.komentar && <p className="text-sm text-cream-dim">“{existingReview.komentar}”</p>}
                  <p className="text-xs text-moss">{t('Terima kasih — ulasanmu membantu kami jadi lebih baik.')}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-cream-dim">{t('Gimana pesananmu? Beri rating biar kami tahu.')}</p>
                  <StarInput value={rating} onChange={setRating} disabled={reviewBusy} />
                  <textarea
                    value={komentar}
                    onChange={(e) => setKomentar(e.target.value.slice(0, 300))}
                    placeholder={t('Tulis komentar (opsional)…')}
                    rows={3}
                    className="w-full resize-none"
                    disabled={reviewBusy}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-moss tabular-nums">{komentar.length}/300</span>
                    <button onClick={submitReview} disabled={reviewBusy || rating < 1} className="btn-wood">
                      {reviewBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />} {reviewBusy ? t('Mengirim…') : t('Kirim Ulasan')}
                    </button>
                  </div>
                  {reviewErr && <Alert>{t(reviewErr)}</Alert>}
                </>
              )}
            </div>
          )}

          {order.status === 'baru' && order.statusBayar !== 'lunas' && (
            <button onClick={() => setCancelOpen(true)} className="btn-danger w-full">{t('Batalkan Pesanan')}</button>
          )}
        </div>

          <Confirm
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            onConfirm={cancel}
            title="Batalkan pesanan?"
            desc={t('Pesanan {kode} akan dibatalkan dan kasir diberitahu. Lanjutkan?', { kode: order.kode })}
            confirmLabel="Ya, Batalkan"
            danger
            busy={cancelBusy}
          />
      </main>
      <Receipt order={order} namaKedai={namaKedai} />
    </>
  );
}

function Receipt({ order, namaKedai }: { order: Order; namaKedai: string }) {
  const { t } = useI18n();
  const sep = 'border-t border-dashed border-black/50 my-2';
  return (
    <div className="hidden print:block bg-white text-black max-w-[72mm] mx-auto px-2 py-4 font-mono text-[11px] leading-relaxed">
      <p className="text-center font-bold text-sm uppercase">{namaKedai}</p>
      <p className="text-center">{t('Nota Pembayaran')}</p>
      <div className={sep} />
      <div className="flex justify-between"><span>{t('Kode')}</span><span className="font-bold">{order.kode}</span></div>
      <div className="flex justify-between"><span>{t('Waktu')}</span><span>{jakartaDateTime(order.dibuat)}</span></div>
      <div className="flex justify-between"><span>{t('Pelanggan')}</span><span>{order.nama}</span></div>
      <div className="flex justify-between"><span>{t('Meja')}</span><span>{order.meja}</span></div>
      <div className={sep} />
      {order.items.map((it, i) => (
        <div key={i} className="mb-1">
          <p>{it.nama}</p>
          <div className="flex justify-between">
            <span>{it.qty} x {rupiah(it.harga)}</span>
            <span>{rupiah(it.harga * it.qty)}</span>
          </div>
        </div>
      ))}
      <div className={sep} />
      <div className="flex justify-between font-bold text-xs"><span>{t('TOTAL')}</span><span>{rupiah(order.total)}</span></div>
      <div className="flex justify-between"><span>{t('Metode')}</span><span>{t(PAY_METHOD_LABEL[order.metode])}</span></div>
      <div className="flex justify-between font-bold"><span>{t('Status')}</span><span>{order.statusBayar === 'lunas' ? t('LUNAS') : t('BELUM BAYAR')}</span></div>
      {order.catatan && (<><div className={sep} /><p>{t('Catatan')}: {order.catatan}</p></>)}
      <div className={sep} />
      <p className="text-center">{t('Terima kasih sudah mampir!')}</p>
      <p className="text-center">{t('Simpan nota ini sebagai bukti pembayaran.')}</p>
    </div>
  );
}