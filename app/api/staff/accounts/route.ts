import crypto from 'crypto';
import { BOSS, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { nowIso } from '@/lib/money';
import { hashPassword } from '@/lib/password';
import { StoredAccount } from '@/lib/types';
import { vOneOf, vPassword, vUsername } from '@/lib/validation';

export async function GET() {
  try {
    await requireRole(BOSS);
    return Response.json({ accounts: await db.listAccounts() });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(BOSS);
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const username = vUsername(body.username);
    const password = vPassword(body.password);
    const role = vOneOf(body.role, 'Peran', ['kasir', 'bos'] as const);
    const t = nowIso();
    const account: StoredAccount = {
      id: crypto.randomUUID(), username, role,
      ...hashPassword(password), dibuat: t, diubah: t,
    };
    const created = await db.createAccount(account);
    logEvent('info', 'akun', `${session.username} membuat akun ${username} (${role})`);
    return Response.json({ account: created });
  } catch (err) {
    return jsonError(err);
  }
}