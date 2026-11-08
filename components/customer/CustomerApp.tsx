'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardList, Copy, Minus, Plus, Search, ShoppingBag, Trash2, Leaf, Megaphone, Wifi, Wrench } from 'lucide-react';
import { api } from '@/lib/api-client';
import { rupiah } from '@/lib/money';
import { MenuItem, PublicData } from '@/lib/types';
import { usePoll } from '@/lib/usePoll';
import { useI18n, LangToggle } from '@/lib/i18n';
import { Alert, EmptyState, Modal } from '@/components/ui';
import Tilt from '@/components/Tilt';
import HeroMedia from '@/components/customer/HeroMedia';
import { useToast } from '@/components/Toast';

type Cart = Record<string, number>;

function loadCart(): Cart {
  try {
    const raw = localStorage.getItem('ab_cart');
    const parsed = raw ? JSON.parse(raw) : {};
    const out: Cart = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 99) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export default function CustomerApp() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const { data, error, loading, refresh } = usePoll<PublicData>('/api/public/data', 15000);
  const [cart, setCart] = useState<Cart>({});
  const [cartReady, setCartReady] = useState(false);
  const [category, setCategory] = useState('Semua');
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [wifiCopied, setWifiCopied] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setLastToken(localStorage.getItem('ab_last_token'));
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem('ab_cart', JSON.stringify(cart));
  }, [cart, cartReady]);

  const menu = data?.menu ?? [];
  const settings = data?.settings;
  const maintenance = settings?.maintenance === '1';

  const categories = useMemo(
    () => ['Semua', ...Array.from(new Set(menu.map((m) => m.kategori))).sort()],
    [menu],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((m) =>
      (category === 'Semua' || m.kategori === category) &&
      (!q || m.nama.toLowerCase().includes(q) || m.deskripsi.toLowerCase().includes(q)),
    );
  }, [menu, category, query]);

  const cartItems = useMemo(() =>
    Object.entries(cart)
      .map(([id, qty]) => ({ item: menu.find((m) => m.id === id), qty }))
      .filter((x): x is { item: MenuItem; qty: number } => !!x.item),
  [cart, menu]);

  // Item yang dihapus bos otomatis hilang dari keranjang.
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.menu.map((m) => m.id));
    setCart((c) => {
      const kept = Object.fromEntries(Object.entries(c).filter(([id]) => ids.has(id)));
      return Object.keys(kept).length === Object.keys(c).length ? c : kept;
    });
  }, [data]);

  const totalQty = cartItems.reduce((s, x) => s + x.qty, 0);
  const totalPrice = cartItems.reduce((s, x) => s + x.item.harga * x.qty, 0);

  const setQty = (id: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(99, qty);
      return next;
    });
  };

  const closeSheet = () => { setSheetOpen(false); setCheckout(false); };

  const copyWifi = async () => {
    const sandi = data?.settings.wifiSandi;
    if (!sandi) return;
    try {
      await navigator.clipboard.writeText(sandi);
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 1800);
    } catch {
      toast('Sandi gagal disalin. Salin manual ya.', 'error');
    }
  };

  return (
    <main className="min-h-dvh pb-28">
      <header className="relative overflow-hidden border-b border-forest-800">
        <div className="relative h-[300px] sm:h-[380px] lg:h-[430px] xl:h-[470px]">
          <HeroMedia alt={t('Ilustrasi hutan Area Barat — tupai menikmati secangkir kopi hangat saat senja')} />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-950/95 via-forest-950/55 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-[240px] bg-gradient-to-t from-forest-950 via-forest-950/80 to-transparent sm:hidden" aria-hidden />
          <div className="relative mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="absolute top-4 right-4 z-30 sm:right-6 lg:right-8">
              <LangToggle />
            </div>
            <div className="flex h-full max-w-md flex-col justify-end pb-6 sm:justify-center sm:pb-0 anim-fade-up">
              <Image src="/logo.webp" alt="Area Barat" width={340} height={128} priority sizes="(max-width: 640px) 200px, (max-width: 1024px) 256px, 304px" className="w-48 sm:w-64 lg:w-72 xl:w-[19rem]" />
              <p className="text-cream-dim text-sm lg:text-base mt-3 max-w-[26ch]">{t('Pesan dari mejamu, pantau pesananmu langsung di sini.')}</p>
              {lastToken && (
                <Link href={`/lacak/${lastToken}`} className="chip glass border-forest-600 text-cream hover:bg-forest-800 mt-4 w-fit">
                  <ClipboardList size={14} aria-hidden /> {t('Pesanan Saya')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {settings?.wifiNama && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-forest-750 bg-forest-900/60 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest-800 text-moss">
                <Wifi size={17} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-moss">{t('WiFi kedai')}</p>
                <p className="text-sm font-semibold text-cream break-words">{settings.wifiNama}</p>
                {settings.wifiSandi && (
                  <p className="mt-0.5 font-mono text-sm text-cream-dim break-all">{settings.wifiSandi}</p>
                )}
              </div>
            </div>
            {settings.wifiSandi && (
              <button type="button" onClick={copyWifi} className="btn-ghost w-full justify-center sm:w-auto">
                {wifiCopied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                {wifiCopied ? t('Tersalin') : t('Salin sandi')}
              </button>
            )}
          </div>
        )}
        {settings?.pengumuman && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-wood-400/40 bg-wood-400/10 px-4 py-3 text-sm text-wood-300">
            <Megaphone size={16} className="shrink-0 mt-0.5" aria-hidden />
            <p>{settings.pengumuman}</p>
          </div>
        )}
        {maintenance && (
          <div className="mt-4">
            <Alert tone="warn">
              <span className="inline-flex items-center gap-1.5"><Wrench size={14} aria-hidden /> {t('Kedai sedang tidak menerima pesanan online untuk sementara. Menu tetap bisa dilihat.')}</span>
            </Alert>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 py-5" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-[4/3]" />
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <div className="skeleton h-10 w-3/4 rounded" />
                  <div className="skeleton h-8 w-1/2 rounded" />
                  <div className="mt-auto flex flex-col gap-2 pt-2 md:flex-row md:items-center md:justify-between">
                    <div className="skeleton h-4 w-16 rounded" />
                    <div className="skeleton h-9 w-full rounded-md md:w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && !data && (
          <div className="py-10 space-y-4">
            <Alert>{t(error)}</Alert>
            <button onClick={refresh} className="btn-primary w-full sm:w-auto">{t('Coba Lagi')}</button>
          </div>
        )}

        {data && (
          <>
            <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-forest-950/80 backdrop-blur-md border-b border-forest-850 mt-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Cari menu…')}
                  className="w-full !pl-9"
                  aria-label={t('Cari menu')}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1" role="tablist" aria-label={t('Kategori menu')}>
                {categories.map((c) => (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={category === c}
                    onClick={() => setCategory(c)}
                    className={`chip whitespace-nowrap ${category === c ? 'bg-forest-600 border-forest-500 text-white' : 'bg-forest-850 border-forest-750 text-cream-dim hover:bg-forest-800'}`}
                  >
                    {c === 'Semua' ? t('Semua') : c}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState title="Menu tidak ditemukan" desc={menu.length === 0 ? 'Belum ada menu. Bos bisa menambahkannya di halaman Bos.' : 'Coba kata kunci atau kategori lain.'} />
            ) : (
              <div className="grid grid-cols-2 items-stretch gap-3 py-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:gap-5">
                {visible.map((m, i) => (
                  <Tilt key={m.id} className="h-full min-w-0">
                    <MenuCard item={m} index={i} qty={cart[m.id] || 0} disabled={maintenance} onSet={(q) => setQty(m.id, q)} />
                  </Tilt>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {totalQty > 0 && !sheetOpen && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-forest-950 via-forest-950/95 to-transparent anim-slide-up">
          <button
            onClick={() => setSheetOpen(true)}
            className="btn-wood w-full max-w-7xl mx-auto flex items-center justify-between gap-2 !px-4 sm:!px-5 shadow-sheet"
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <ShoppingBag size={18} aria-hidden />
              <span>{t(totalQty === 1 ? '1 item' : '{n} item', { n: totalQty })}</span>
            </span>
            <span className="font-display font-bold text-sm sm:text-base">{rupiah(totalPrice)}</span>
            <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{t('Lihat Keranjang')}</span>
          </button>
        </div>
      )}

      <Modal open={sheetOpen} onClose={closeSheet} title={checkout ? t('Detail Pemesanan') : t('Keranjang')}>
        {!checkout ? (
          <div className="space-y-3">
            {cartItems.length === 0 ? (
              <EmptyState title="Keranjang kosong" desc="Yuk pilih menu favoritmu dulu." />
            ) : (
              <>
                {cartItems.map(({ item, qty }) => (
                  <div key={item.id} className="card !rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm break-words">{item.nama}</p>
                        <p className="text-moss text-xs">{rupiah(item.harga)} × {qty}</p>
                        {!item.tersedia && <p className="text-red-300 text-xs mt-0.5">{t('Sedang habis — hapus dari keranjang')}</p>}
                      </div>
                      <button onClick={() => setQty(item.id, 0)} className="text-moss hover:text-red-300 p-2 -mr-1 -mt-1 shrink-0 cursor-pointer" aria-label={t('Hapus {nama}', { nama: item.nama })}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Stepper qty={qty} onSet={(q) => setQty(item.id, q)} small />
                      <span className="font-display font-bold text-sm tabular-nums">{rupiah(item.harga * qty)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-forest-750">
                  <span className="text-cream-dim text-sm">{t('Total')}</span>
                  <span className="font-display font-bold text-lg">{rupiah(totalPrice)}</span>
                </div>
                <button
                  onClick={() => setCheckout(true)}
                  disabled={maintenance || cartItems.some((x) => !x.item.tersedia)}
                  className="btn-primary w-full"
                >
                  {t('Lanjut ke Pemesanan')}
                </button>
              </>
            )}
          </div>
        ) : (
          <CheckoutForm
            items={cartItems}
            total={totalPrice}
            qrisAvailable={!!settings?.qrisId}
            onBack={() => setCheckout(false)}
            onSuccess={(token) => {
              setCart({});
              localStorage.setItem('ab_last_token', token);
              closeSheet();
              toast('Pesanan terkirim ke kasir!', 'ok');
              router.push(`/lacak/${token}`);
            }}
          />
        )}
      </Modal>
    </main>
  );
}

function Stepper({ qty, onSet, small = false, className = '' }: { qty: number; onSet: (q: number) => void; small?: boolean; className?: string }) {
  const { t } = useI18n();
  const size = small ? '!min-h-[36px] !px-2 !py-1' : '';
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button onClick={() => onSet(qty - 1)} className={`btn-ghost ${size}`} aria-label={t('Kurangi')}>
        <Minus size={14} />
      </button>
      <span className="w-7 text-center font-bold text-sm tabular-nums">{qty}</span>
      <button onClick={() => onSet(qty + 1)} className={`btn-ghost ${size}`} aria-label={t('Tambah')}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function MenuCard({ item, index, qty, disabled, onSet }: { item: MenuItem; index: number; qty: number; disabled: boolean; onSet: (q: number) => void }) {
  const { t } = useI18n();
  const habis = !item.tersedia;
  return (
    <div className={`card card-lift flex h-full flex-col overflow-hidden anim-fade-up ${habis ? 'opacity-60' : ''}`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-forest-800">
        {item.fotoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/img/${item.fotoId}`} alt={item.nama} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-forest-800 via-forest-850 to-forest-900">
            <span className="w-14 h-14 rounded-full bg-forest-750/60 border border-forest-700 flex items-center justify-center">
              <Leaf size={26} className="text-forest-400" aria-hidden />
            </span>
          </div>
        )}
        {habis && (
          <span className="absolute top-2 left-2 badge bg-danger text-white">{t('Habis')}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <p className="min-h-[2.75em] font-display font-semibold text-sm leading-snug break-words line-clamp-2">{item.nama}</p>
        <p className="min-h-[2rem] text-xs leading-4 text-moss line-clamp-2">{item.deskripsi || '\u00A0'}</p>
        <div className="mt-auto flex flex-col gap-2 pt-2 md:flex-row md:items-center md:justify-between">
          <span className="font-bold text-sm text-wood-300 whitespace-nowrap">{rupiah(item.harga)}</span>
          {habis || disabled ? null : qty === 0 ? (
            <button onClick={() => onSet(1)} className="btn-primary w-full md:w-auto !min-h-[36px] !px-3 !py-1.5 !text-xs" aria-label={t('Tambah {nama} ke keranjang', { nama: item.nama })}>
              <Plus size={14} /> {t('Tambah')}
            </button>
          ) : (
            <Stepper qty={qty} onSet={onSet} small className="w-full justify-between md:w-auto md:justify-start" />
          )}
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({ items, total, qrisAvailable, onBack, onSuccess }: {
  items: { item: MenuItem; qty: number }[];
  total: number;
  qrisAvailable: boolean;
  onBack: () => void;
  onSuccess: (token: string) => void;
}) {
  const { t } = useI18n();
  const [nama, setNama] = useState('');
  const [meja, setMeja] = useState('');
  const [metode, setMetode] = useState<'qris' | 'tunai'>(qrisAvailable ? 'qris' : 'tunai');
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await api<{ token: string }>('/api/public/orders', 'POST', {
        nama, meja, metode, catatan,
        items: items.map((x) => ({ menuId: x.item.id, qty: x.qty })),
      });
      onSuccess(res.token);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal mengirim pesanan.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <Alert>{t(err)}</Alert>}
      <div>
        <label htmlFor="co-nama" className="label">{t('Nama Kamu')}</label>
        <input id="co-nama" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={40} required placeholder={t('Contoh: Budi')} className="w-full" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="co-meja" className="label">{t('Nomor Meja')}</label>
        <input id="co-meja" value={meja} onChange={(e) => setMeja(e.target.value)} maxLength={12} required placeholder={t('Contoh: 5 (atau tulis Bawa Pulang)')} className="w-full" />
      </div>
      <div>
        <span className="label">{t('Metode Pembayaran')}</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMetode('qris')}
            disabled={!qrisAvailable}
            className={`btn ${metode === 'qris' ? 'bg-forest-600 text-white border border-forest-500' : 'btn-ghost'}`}
            aria-pressed={metode === 'qris'}
          >
            QRIS {!qrisAvailable && t('(belum tersedia)')}
          </button>
          <button
            type="button"
            onClick={() => setMetode('tunai')}
            className={`btn ${metode === 'tunai' ? 'bg-forest-600 text-white border border-forest-500' : 'btn-ghost'}`}
            aria-pressed={metode === 'tunai'}
          >
            {t('Tunai')}
          </button>
        </div>
        <p className="text-xs text-moss mt-1.5">
          {metode === 'qris'
            ? t('Bayar di meja kasir saat ambil pesanan — kasir menunjukkan QR QRIS dengan nominal yang sesuai.')
            : t('Bayar tunai di meja kasir saat mengambil pesanan.')}
        </p>
      </div>
      <div>
        <label htmlFor="co-catatan" className="label">{t('Catatan (opsional)')}</label>
        <textarea id="co-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={200} rows={2} placeholder={t('Contoh: es batu sedikit saja')} className="w-full resize-none" />
      </div>
      <div className="rounded-lg bg-forest-900 border border-forest-750 p-3 space-y-1.5">
        {items.map((x) => (
          <div key={x.item.id} className="flex justify-between gap-2 text-xs text-cream-dim">
            <span>{x.qty}× {x.item.nama}</span>
            <span className="tabular-nums">{rupiah(x.item.harga * x.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1.5 border-t border-forest-750 text-sm font-bold">
          <span>{t('Total')}</span>
          <span className="text-wood-300 tabular-nums">{rupiah(total)}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-ghost flex-1" disabled={busy}>{t('Kembali')}</button>
        <button type="submit" className="btn-wood flex-1" disabled={busy}>
          {busy ? t('Mengirim…') : t('Kirim Pesanan')}
        </button>
      </div>
    </form>
  );
}