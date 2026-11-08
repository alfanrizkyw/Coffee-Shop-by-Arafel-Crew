import crypto from 'crypto';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { nowIso } from '@/lib/money';
import { rateLimit } from '@/lib/rate-limit';
import { Review } from '@/lib/types';
import { clientIp, vInt, vStr } from '@/lib/validation';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,40}$/;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!TOKEN_RE.test(token)) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    rateLimit(`review:${clientIp(req)}`, 10, 60 * 1000);
    const order = await db.getOrderByToken(token);
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'selesai') {
      throw new ApiError(400, 'Ulasan hanya bisa diberikan setelah pesanan selesai.');
    }
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const rating = vInt(body.rating, 'Rating', 1, 5);
    const komentar = vStr(body.komentar ?? '', 'Komentar', 0, 300);
    if (await db.getReviewByOrder(order.id)) {
      throw new ApiError(409, 'Pesanan ini sudah diberi ulasan. Terima kasih!');
    }
    const review: Review = {
      id: crypto.randomUUID(),
      orderId: order.id,
      kode: order.kode,
      nama: order.nama,
      rating,
      komentar,
      dibuat: nowIso(),
    };
    await db.addReview(review);
    logEvent('info', 'ulasan', `Ulasan ${rating}/5 untuk ${order.kode} dari ${order.nama}`, komentar);
    return Response.json({ review });
  } catch (err) {
    return jsonError(err);
  }
}