import { NextResponse } from 'next/server';
import { signSession, verifyPasswordTimingSafe, SESSION_COOKIE, COOKIE_MAX_AGE } from '../../../lib/auth';
import { getUserRecord, normalizeUsername, checkLoginRateLimit, resetLoginRateLimit } from '../../../lib/kv';

function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));
  const clean = normalizeUsername(username);

  if (!clean || !password) {
    return NextResponse.json({ error: 'Enter a username and password' }, { status: 400 });
  }

  const rateLimitKey = `login:${clientIp(request)}:${clean}`;
  const allowed = await checkLoginRateLimit(rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  const record = await getUserRecord(clean);
  // Always runs bcrypt, even when the user doesn't exist, so a nonexistent
  // username doesn't respond measurably faster than a wrong password.
  const ok = await verifyPasswordTimingSafe(password, record?.passwordHash);

  // Same error either way — don't reveal whether the username exists.
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }
  if (record.suspended) {
    return NextResponse.json({ error: 'This account has been suspended. Contact the admin.' }, { status: 403 });
  }

  await resetLoginRateLimit(rateLimitKey);

  let token;
  try {
    token = signSession({ sub: clean, role: 'user' });
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured — contact the admin.' }, { status: 500 });
  }

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
