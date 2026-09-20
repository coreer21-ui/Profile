import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { signSession, ADMIN_COOKIE, COOKIE_MAX_AGE } from '../../../../lib/auth';
import { checkLoginRateLimit, resetLoginRateLimit } from '../../../../lib/kv';

function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD || '';

  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not configured on the server yet.' },
      { status: 500 }
    );
  }

  // This is the single highest-value password in the whole app — rate
  // limit it by IP regardless of what was typed.
  const rateLimitKey = `admin-login:${clientIp(request)}`;
  const allowed = await checkLoginRateLimit(rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  if (!password || !safeEqual(password, expected)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  await resetLoginRateLimit(rateLimitKey);

  let token;
  try {
    token = signSession({ sub: 'admin', role: 'admin' });
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
  return res;
}
