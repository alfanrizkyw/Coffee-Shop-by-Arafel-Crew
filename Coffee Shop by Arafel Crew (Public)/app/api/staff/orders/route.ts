import { requireRole, STAFF } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/errors';
import { nowIso } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireRole(STAFF);
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam && !Number.isNaN(Date.parse(sinceParam))
      ? sinceParam
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const orders = await db.getOrders({ since, limit: 300 });
    return Response.json({ orders, serverTime: nowIso() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}