import { BOSS, requireRole, STAFF } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { MenuInput } from '@/lib/types';
import { vBool, vInt, vStr } from '@/lib/validation';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(STAFF);
    const { id } = await params;
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });

    const keys = Object.keys(body).filter((k) => k !== 'expect');
    if (keys.length === 0) throw new ApiError(400, 'Tidak ada perubahan.');
    const onlyAvailability = keys.length === 1 && keys[0] === 'tersedia';
    if (!onlyAvailability) await requireRole(BOSS);

    const patch: Partial<MenuInput> = {};
    if (body.nama !== undefined) patch.nama = vStr(body.nama, 'Nama menu', 1, 60);
    if (body.kategori !== undefined) patch.kategori = vStr(body.kategori, 'Kategori', 1, 30);
    if (body.harga !== undefined) patch.harga = vInt(body.harga, 'Harga', 0, 10_000_000);
    if (body.deskripsi !== undefined) patch.deskripsi = vStr(body.deskripsi, 'Deskripsi', 0, 300);
    if (body.fotoId !== undefined) patch.fotoId = vStr(body.fotoId, 'Foto', 0, 80);
    if (body.tersedia !== undefined) patch.tersedia = vBool(body.tersedia, 'Tersedia');

    const expect = body.expect ? vStr(body.expect, 'expect', 1, 40) : undefined;
    const updated = await db.updateMenu(id, patch, expect);
    logEvent('info', 'menu', `${session.username} mengubah menu "${updated.nama}"`, JSON.stringify(patch));
    return Response.json({ menu: updated });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(BOSS);
    const { id } = await params;
    const menu = await db.getMenu();
    const item = menu.find((m) => m.id === id);
    if (!item) throw new ApiError(404, 'Menu tidak ditemukan.');
    await db.deleteMenu(id);
    logEvent('warn', 'menu', `${session.username} menghapus menu "${item.nama}"`);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}