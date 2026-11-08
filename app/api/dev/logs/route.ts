import { DEV, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireRole(DEV);
    const url = new URL(req.url);
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 200));
    const logs = await db.getLogs(limit);
    return Response.json({ logs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  try {
    const session = await requireRole(DEV);
    await db.clearLogs();
    logEvent('warn', 'dev', `${session.username} membersihkan semua log`);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}