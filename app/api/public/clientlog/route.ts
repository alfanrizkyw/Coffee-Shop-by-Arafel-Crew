import { jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp, vStr } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    rateLimit(`clientlog:${clientIp(req)}`, 10, 60 * 1000);
    const body = await req.json().catch(() => ({}));
    const pesan = vStr(body.pesan ?? 'Error client tanpa pesan', 'pesan', 1, 500);
    const detail = vStr(body.detail ?? '', 'detail', 0, 2000);
    logEvent('error', 'client', pesan, detail);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}