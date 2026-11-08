import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,40}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!TOKEN_RE.test(token)) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const order = await db.getOrderByToken(token);
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan. Pastikan link benar.');
    const review = await db.getReviewByOrder(order.id);
    return Response.json({ order, review }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}