import { NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_COOKIE_BASE, isSecureCookie } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok:true });
  res.cookies.set(AUTH_COOKIE, '', {
    ...AUTH_COOKIE_BASE,
    httpOnly: true,
    secure: isSecureCookie(),
    maxAge: 0,
  });
  return res;
}
