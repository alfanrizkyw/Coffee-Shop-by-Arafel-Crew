import { BOSS, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp, vImage } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await requireRole(BOSS);
    rateLimit(`upload:${session.username}:${clientIp(req)}`, 30, 60 * 1000);
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const { b64, mime } = vImage(body);
    const id = await db.saveImage(b64, mime);
    return Response.json({ id, url: `/api/img/${id}` });
  } catch (err) {
    return jsonError(err);
  }
}