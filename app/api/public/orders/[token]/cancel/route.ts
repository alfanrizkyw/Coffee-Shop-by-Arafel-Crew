import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/validation';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    rateLimit(`cancel:${clientIp(req)}`, 6, 60 * 1000);
    const { token } = await params;
    const order = await db.getOrderByToken(token);
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'baru') {
      throw new ApiError(400, 'Pesanan sudah diproses kasir, tidak bisa dibatalkan sendiri. Hubungi kasir ya.');
    }
    if (order.statusBayar === 'lunas') throw new ApiError(400, 'Pesanan sudah lunas, hubungi kasir untuk pembatalan.');
    const updated = await db.updateOrder(order.id, { status: 'batal' }, order.diubah);
    logEvent('info', 'pesanan', `Pesanan ${order.kode} dibatalkan pelanggan`);
    return Response.json({ ok: true, order: updated });
  } catch (err) {
    return jsonError(err);
  }
}