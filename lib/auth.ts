import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { ApiError } from './errors';
import { verifyPassword } from './password';
import { SESSION_COOKIE, Session, verifySession } from './session';
import { Role } from './types';

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Akun kasir/bos tersimpan di database (dikelola bos). Akun dev hanya lewat env server.
export async function checkLogin(username: string, password: string): Promise<{ role: Role; pv: string } | null> {
  if (username === 'dev') {
    return safeEqual(password, process.env.DEV_PASSWORD || 'dev') ? { role: 'dev', pv: 'env' } : null;
  }
  const acc = await db.getAccount(username);
  if (!acc) {
    verifyPassword(password, 'dummy-salt', '0'.repeat(64));
    return null;
  }
  return verifyPassword(password, acc.salt, acc.hash) ? { role: acc.role, pv: acc.diubah } : null;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError(401, 'Silakan login dulu.');
  if (session.role === 'dev') {
    if (!roles.includes('dev')) throw new ApiError(403, 'Akses ditolak untuk peran ini.');
    return session;
  }
  const accounts = await db.listAccounts();
  const acc = accounts.find((a) => a.username === session.username);
  if (!acc || acc.diubah !== session.pv) {
    throw new ApiError(401, 'Akun ini sudah diubah atau dihapus. Silakan login ulang.');
  }
  if (!roles.includes(acc.role)) throw new ApiError(403, 'Akses ditolak untuk peran ini.');
  return { ...session, role: acc.role };
}

export const STAFF: Role[] = ['kasir', 'bos', 'dev'];
export const BOSS: Role[] = ['bos', 'dev'];
export const DEV: Role[] = ['dev'];