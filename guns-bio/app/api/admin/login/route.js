import { NextResponse } from 'next/server';
import { signSession, ADMIN_COOKIE, COOKIE_MAX_AGE } from '../../../../lib/auth';

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD || '';

  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not configured on the server yet.' },
      { status: 500 }
    );
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = signSession({ sub: 'admin', role: 'admin' });
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
