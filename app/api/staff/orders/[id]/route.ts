import { requireRole, STAFF } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { ALLOWED_STATUS_TRANSITION, OrderStatus, PayStatus } from '@/lib/types';
import { vOneOf, vStr } from '@/lib/validation';

const PAY_TRANSITION: Record<PayStatus, PayStatus[]> = {
  belum_bayar: ['lunas'],
  lunas: ['belum_bayar'],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(STAFF);
    const { id } = await params;
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const order = await db.getOrderById(id);
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');

    const patch: Partial<{ status: OrderStatus; statusBayar: PayStatus }> = {};
    if (body.status !== undefined) {
      const target = vOneOf(body.status, 'Status', ['baru', 'diproses', 'siap', 'selesai', 'batal'] as const);
      if (!ALLOWED_STATUS_TRANSITION[order.status].includes(target)) {
        throw new ApiError(400, `Tidak bisa mengubah status dari "${order.status}" ke "${target}".`);
      }
      patch.status = target;
    }
    if (body.statusBayar !== undefined) {
      const target = vOneOf(body.statusBayar, 'Status bayar', ['belum_bayar', 'lunas'] as const);
      if (!PAY_TRANSITION[order.statusBayar].includes(target)) {
        throw new ApiError(400, `Transisi pembayaran "${order.statusBayar}" ke "${target}" tidak diizinkan.`);
      }
      patch.statusBayar = target;
    }
    if (Object.keys(patch).length === 0) throw new ApiError(400, 'Tidak ada perubahan.');

    const finalPay = patch.statusBayar ?? order.statusBayar;
    if (patch.status === 'selesai' && finalPay !== 'lunas') {
      throw new ApiError(400, 'Tandai pembayaran LUNAS dulu sebelum menyelesaikan pesanan.');
    }

    const expect = body.expect ? vStr(body.expect, 'expect', 1, 40) : undefined;
    const updated = await db.updateOrder(id, patch, expect);
    const changes = Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ');
    const level = patch.statusBayar === 'belum_bayar' && order.statusBayar === 'lunas' ? 'warn' : 'info';
    logEvent(level, 'kasir', `${session.username} mengubah ${order.kode}: ${changes}`, `sebelum: status=${order.status}, bayar=${order.statusBayar}`);
    return Response.json({ order: updated });
  } catch (err) {
    return jsonError(err);
  }
}