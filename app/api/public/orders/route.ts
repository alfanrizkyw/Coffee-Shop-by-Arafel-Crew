import crypto from 'crypto';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { nowIso, rupiah } from '@/lib/money';
import { rateLimit } from '@/lib/rate-limit';
import { Order, OrderItem, PayMethod } from '@/lib/types';
import { clientIp, vInt, vOneOf, vStr } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    rateLimit(`order:${clientIp(req)}`, 10, 60 * 1000);
    const settings = await db.getSettings();
    if (settings.maintenance === '1') {
      throw new ApiError(503, 'Kedai sedang tidak menerima pesanan (maintenance). Coba lagi nanti ya.');
    }

    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const nama = vStr(body.nama, 'Nama', 1, 40);
    const meja = vStr(body.meja, 'Meja', 1, 12);
    const catatan = vStr(body.catatan ?? '', 'Catatan', 0, 200);
    const metode: PayMethod = vOneOf(body.metode, 'Metode bayar', ['qris', 'tunai'] as const);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
      throw new ApiError(400, 'Keranjang kosong atau terlalu banyak item.');
    }
    if (metode === 'qris' && !settings.qrisId) {
      throw new ApiError(400, 'Pembayaran QRIS belum tersedia. Pilih Tunai dulu ya.');
    }

    const qtyById = new Map<string, number>();
    for (const raw of body.items) {
      const menuId = vStr(raw?.menuId, 'Menu', 1, 80);
      const qty = vInt(raw?.qty, 'Jumlah', 1, 99);
      qtyById.set(menuId, (qtyById.get(menuId) || 0) + qty);
    }

    // Harga dan ketersediaan selalu diambil dari database, bukan dari client.
    const menu = await db.getMenu();
    const items: OrderItem[] = [];
    let total = 0;
    for (const [menuId, qty] of qtyById) {
      const m = menu.find((x) => x.id === menuId);
      if (!m) throw new ApiError(400, 'Ada menu yang sudah dihapus. Muat ulang halaman.');
      if (!m.tersedia) throw new ApiError(409, `"${m.nama}" baru saja habis. Hapus dari keranjang lalu coba lagi.`);
      if (qty > 99) throw new ApiError(400, `Jumlah "${m.nama}" maksimal 99.`);
      items.push({ menuId: m.id, nama: m.nama, harga: m.harga, qty });
      total += m.harga * qty;
    }

    const t = nowIso();
    const order: Order = {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(16).toString('base64url'),
      kode: `AB-${String(crypto.randomInt(10000)).padStart(4, '0')}`,
      nama, meja, items, total,
      metode,
      statusBayar: 'belum_bayar',
      status: 'baru',
      catatan,
      dibuat: t,
      diubah: t,
    };
    await db.addOrder(order);
    logEvent('info', 'pesanan', `Pesanan baru ${order.kode} — ${nama} (meja ${meja}), ${rupiah(total)}, ${metode.toUpperCase()}`);
    return Response.json({ token: order.token, kode: order.kode, total: order.total });
  } catch (err) {
    return jsonError(err);
  }
}