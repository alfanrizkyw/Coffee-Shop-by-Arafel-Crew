import { BOSS, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/errors';
import { buildReport, Report } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const cache = new Map<number, { t: number; data: Report }>();

export async function GET(req: Request) {
  try {
    await requireRole(BOSS);
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get('range') || '7';
    const rangeDays = rangeParam === '30' ? 30 : rangeParam === '1' ? 1 : 7;

    const hit = cache.get(rangeDays);
    if (hit && Date.now() - hit.t < 20000) {
      return Response.json(hit.data, { headers: { 'Cache-Control': 'no-store' } });
    }

    const since = new Date(Date.now() - (rangeDays + 1) * 86400000).toISOString();
    const [orders, reviews] = await Promise.all([
      db.getOrders({ since, full: true }),
      db.getReviews({ since }),
    ]);
    const report = buildReport(orders, rangeDays, reviews);
    cache.set(rangeDays, { t: Date.now(), data: report });
    return Response.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}