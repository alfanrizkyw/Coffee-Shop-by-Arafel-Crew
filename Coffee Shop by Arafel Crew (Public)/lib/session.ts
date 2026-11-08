import { SignJWT, jwtVerify } from 'jose';
import { Role } from './types';

export const SESSION_COOKIE = 'ab_session';
export const SESSION_MAX_AGE = 60 * 60 * 12;

export interface Session {
  username: string;
  role: Role;
  pv: string;
}

function secretKey(): Uint8Array {
  const s =
    process.env.SESSION_SECRET ||
    (process.env.GOOGLE_SCRIPT_SECRET ? `${process.env.GOOGLE_SCRIPT_SECRET}|area-barat-session-v1` : '') ||
    (process.env.NODE_ENV !== 'production' ? 'area-barat-demo-session-secret-32chars' : '');
  return new TextEncoder().encode(s);
}

export function sessionConfigured(): boolean {
  return secretKey().length >= 32;
}

export async function signSession(username: string, role: Role, pv: string): Promise<string> {
  return new SignJWT({ role, pv })
    .setSubject(username)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const key = secretKey();
    if (key.length < 32) return null;
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const role = payload.role;
    if ((role === 'kasir' || role === 'bos' || role === 'dev') && typeof payload.sub === 'string' && typeof payload.pv === 'string') {
      return { username: payload.sub, role, pv: payload.pv };
    }
    return null;
  } catch {
    return null;
  }
}

export function homeFor(role: Role): string {
  return role === 'kasir' ? '/kasir' : role === 'bos' ? '/bos' : '/dev';
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
};