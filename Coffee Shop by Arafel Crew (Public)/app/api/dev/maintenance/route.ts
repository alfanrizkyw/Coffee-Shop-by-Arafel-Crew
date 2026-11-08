import { DEV, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { vBool } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await requireRole(DEV);
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const on = vBool(body.on, 'on');
    await db.setSetting('maintenance', on ? '1' : '0');
    logEvent('warn', 'dev', `${session.username} ${on ? 'mengaktifkan' : 'mematikan'} mode maintenance`);
    return Response.json({ ok: true, maintenance: on });
  } catch (err) {
    return jsonError(err);
  }
}