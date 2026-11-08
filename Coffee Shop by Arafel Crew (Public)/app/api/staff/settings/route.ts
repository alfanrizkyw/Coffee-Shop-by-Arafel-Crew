import { BOSS, requireRole, STAFF } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { AppSettings } from '@/lib/types';
import { vOneOf, vStr } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(STAFF);
    const settings = await db.getSettings();
    return Response.json({ settings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireRole(BOSS);
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const key = vOneOf(body.key, 'Key', ['namaKedai', 'qrisId', 'pengumuman', 'wifiNama', 'wifiSandi'] as const) as keyof AppSettings;
    const maxLen = key === 'pengumuman' ? 200 : key === 'wifiNama' ? 32 : key === 'wifiSandi' ? 63 : 80;
    const value = vStr(body.value ?? '', 'Nilai', 0, maxLen);
    await db.setSetting(key, value);
    logEvent('info', 'settings', `${session.username} mengubah ${key}`, key === 'wifiSandi' ? '(disembunyikan)' : key === 'qrisId' ? `qrisId=${value}` : value);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}