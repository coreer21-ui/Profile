import { NextResponse } from 'next/server';
import { signSession, verifyPassword, SESSION_COOKIE, COOKIE_MAX_AGE } from '../../../lib/auth';
import { getUserRecord, normalizeUsername } from '../../../lib/kv';

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));
  const clean = normalizeUsername(username);

  if (!clean || !password) {
    return NextResponse.json({ error: 'Enter a username and password' }, { status: 400 });
  }

  const record = await getUserRecord(clean);
  const ok = record ? await verifyPassword(password, record.passwordHash) : false;

  // Same error either way — don't reveal whether the username exists.
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }
  if (record.suspended) {
    return NextResponse.json({ error: 'This account has been suspended. Contact the admin.' }, { status: 403 });
  }

  const token = signSession({ sub: clean, role: 'user' });
  const res = NextResponse.json({ ok: true, username: clean });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
  return res;
}
