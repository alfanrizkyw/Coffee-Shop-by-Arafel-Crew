import { BOSS, requireRole, STAFF } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { MenuInput } from '@/lib/types';
import { vBool, vInt, vStr } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(STAFF);
    const menu = await db.getMenu();
    return Response.json({ menu }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(BOSS);
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const input: MenuInput = {
      nama: vStr(body.nama, 'Nama menu', 1, 60),
      kategori: vStr(body.kategori, 'Kategori', 1, 30),
      harga: vInt(body.harga, 'Harga', 0, 10_000_000),
      deskripsi: vStr(body.deskripsi ?? '', 'Deskripsi', 0, 300),
      fotoId: vStr(body.fotoId ?? '', 'Foto', 0, 80),
      tersedia: body.tersedia === undefined ? true : vBool(body.tersedia, 'Tersedia'),
    };
    const menu = await db.getMenu();
    if (menu.some((m) => m.nama.toLowerCase() === input.nama.toLowerCase())) {
      throw new ApiError(400, `Menu "${input.nama}" sudah ada. Gunakan nama lain atau edit menu yang ada.`);
    }
    const created = await db.addMenu(input);
    logEvent('info', 'menu', `${session.username} menambah menu "${created.nama}" (${created.kategori})`);
    return Response.json({ menu: created });
  } catch (err) {
    return jsonError(err);
  }
}