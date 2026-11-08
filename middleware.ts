import { NextRequest, NextResponse } from 'next/server';
import { homeFor, SESSION_COOKIE, verifySession } from '@/lib/session';
import { Role } from '@/lib/types';

const ACCESS: Record<string, Role[]> = {
  '/kasir': ['kasir', 'bos', 'dev'],
  '/bos': ['bos', 'dev'],
  '/dev': ['dev'],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const prefix = Object.keys(ACCESS).find((p) => path === p || path.startsWith(`${p}/`));
  if (!prefix) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!ACCESS[prefix].includes(session.role)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/kasir/:path*', '/bos/:path*', '/dev/:path*'] };