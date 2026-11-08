import { DEV, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/errors';
import { nowIso } from '@/lib/money';
import { sessionConfigured } from '@/lib/session';
import { DiagResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(DEV);
    const start = Date.now();
    let diag: DiagResult | null = null;
    let diagError = '';
    try {
      diag = await db.diagnose();
    } catch (err) {
      diagError = err instanceof Error ? err.message : String(err);
    }
    return Response.json({
      mode: db.mode,
      time: nowIso(),
      latencyMs: Date.now() - start,
      env: {
        scriptUrl: !!process.env.GOOGLE_SCRIPT_URL,
        scriptSecret: !!process.env.GOOGLE_SCRIPT_SECRET,
        sessionSecret: sessionConfigured(),
      },
      diag,
      diagError,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}