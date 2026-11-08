import { NextResponse } from 'next/server';
import { checkLogin } from '@/lib/auth';
import { ApiError, jsonError } from '@/lib/errors';
import { logEvent } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';
import { cookieOptions, homeFor, SESSION_COOKIE, sessionConfigured, signSession } from '@/lib/session';
import { clientIp, vStr } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    if (!sessionConfigured()) {
      throw new ApiError(503, 'SESSION_SECRET belum diatur di server. Lihat SETUP.md bagian environment variable.');
    }
    const ip = clientIp(req);
    rateLimit(`login:ip:${ip}`, 20, 5 * 60 * 1000);
    const body = await req.json().catch(() => { throw new ApiError(400, 'Permintaan tidak valid.'); });
    const username = vStr(body.username, 'Username', 1, 30).toLowerCase();
    const password = vStr(body.password, 'Password', 1, 100);
    rateLimit(`login:u:${ip}:${username}`, 6, 5 * 60 * 1000);

    const result = await checkLogin(username, password);
    if (!result) {
      logEvent('warn', 'auth', `Login gagal untuk "${username}"`, `ip=${ip}`);
      throw new ApiError(401, 'Username atau password salah.');
    }
    const { role, pv } = result;
    const token = await signSession(username, role, pv);
    const res = NextResponse.json({ role, redirect: homeFor(role) });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions);
    logEvent('info', 'auth', `Login berhasil: ${username} (${role})`, `ip=${ip}`);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}