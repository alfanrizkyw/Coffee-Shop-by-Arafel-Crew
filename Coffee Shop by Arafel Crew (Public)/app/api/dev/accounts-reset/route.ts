import { DEV, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';

export async function POST() {
  try {
    const session = await requireRole(DEV);
    const results = await db.resetAccounts();
    logEvent('warn', 'dev', `${session.username} mereset akun staff ke default`, results.join('; '));
    return Response.json({ results });
  } catch (err) {
    return jsonError(err);
  }
}