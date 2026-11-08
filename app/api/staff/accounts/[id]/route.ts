import { BOSS, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { hashPassword } from '@/lib/password';
import { StoredAccount } from '@/lib/types';
import { vOneOf, vPassword, vStr, vUsername } from '@/lib/validation';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(BOSS);
    const { id } = await params;
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const accounts = await db.listAccounts();
    const acc = accounts.find((a) => a.id === id);
    if (!acc) throw new ApiError(404, 'Akun tidak ditemukan.');

    const patch: Partial<Pick<StoredAccount, 'username' | 'role' | 'salt' | 'hash'>> = {};
    if (body.username !== undefined && body.username !== acc.username) patch.username = vUsername(body.username);
    if (body.role !== undefined && body.role !== acc.role) {
      patch.role = vOneOf(body.role, 'Peran', ['kasir', 'bos'] as const);
      if (acc.role === 'bos' && accounts.filter((a) => a.role === 'bos').length <= 1) {
        throw new ApiError(400, 'Minimal harus ada satu akun bos. Buat akun bos lain dulu sebelum mengubah peran ini.');
      }
    }
    if (body.password !== undefined && body.password !== '') {
      const { salt, hash } = hashPassword(vPassword(body.password));
      patch.salt = salt;
      patch.hash = hash;
    }
    if (Object.keys(patch).length === 0) throw new ApiError(400, 'Tidak ada perubahan.');

    const expect = body.expect ? vStr(body.expect, 'expect', 1, 40) : acc.diubah;
    const updated = await db.updateAccount(id, patch, expect);
    logEvent('warn', 'akun', `${session.username} mengubah akun ${acc.username}${patch.username ? ` → ${patch.username}` : ''}${patch.salt ? ' (password diganti)' : ''}${patch.role ? ` (peran → ${patch.role})` : ''}`);
    return Response.json({ account: updated });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(BOSS);
    const { id } = await params;
    const accounts = await db.listAccounts();
    const acc = accounts.find((a) => a.id === id);
    if (!acc) throw new ApiError(404, 'Akun tidak ditemukan.');
    if (acc.username === session.username) throw new ApiError(400, 'Tidak bisa menghapus akun yang sedang dipakai login.');
    if (acc.role === 'bos' && accounts.filter((a) => a.role === 'bos').length <= 1) {
      throw new ApiError(400, 'Minimal harus ada satu akun bos.');
    }
    const body = await req.json().catch(() => ({}));
    const expect = body?.expect ? vStr(body.expect, 'expect', 1, 40) : acc.diubah;
    if (expect !== acc.diubah) throw new ApiError(409, 'Data sudah diubah perangkat lain. Muat ulang lalu coba lagi.');
    await db.deleteAccount(id);
    logEvent('warn', 'akun', `${session.username} menghapus akun ${acc.username} (${acc.role})`);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}