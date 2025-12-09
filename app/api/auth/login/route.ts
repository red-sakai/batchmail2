import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { AUTH_COOKIE, AUTH_COOKIE_BASE, AUTH_MAX_AGE_SECONDS, isSecureCookie } from '@/lib/auth';

export const runtime = 'nodejs';

type LoginBody = { email?: string; password?: string };

export async function POST(req: Request) {
  let body: LoginBody = {};
  try { body = await req.json() as LoginBody; } catch {}
  const { email, password } = body || {} as LoginBody;
  const ADMIN_EMAIL_RAW = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD_RAW = process.env.ADMIN_PASSWORD;
  const ADMIN_EMAIL = ADMIN_EMAIL_RAW?.trim();
  const ADMIN_PASSWORD = ADMIN_PASSWORD_RAW?.trim();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    const missing = [!ADMIN_EMAIL ? 'ADMIN_EMAIL' : null, !ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : null].filter(Boolean);
    return NextResponse.json({ ok:false, error:'Admin credentials not configured', missing }, { status:500 });
  }
  if (!email || !password) {
    return NextResponse.json({ ok:false, error:'Missing email or password' }, { status:400 });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const adminEmailNorm = String(ADMIN_EMAIL).trim().toLowerCase();
  const passNorm = String(password).trim();
  if (emailNorm !== adminEmailNorm || passNorm !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok:false, error:'Invalid credentials' }, { status:401 });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const res = NextResponse.json({ ok:true });
  res.cookies.set(AUTH_COOKIE, token, {
    ...AUTH_COOKIE_BASE,
    httpOnly: true,
    secure: isSecureCookie(),
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  return res;
}
