import { NextResponse } from 'next/server';
import { isAdminFromRequestCookies } from '../../../../lib/session';
import { hashPassword } from '../../../../lib/auth';
import { createUser, listUsernames, normalizeUsername, deleteUser } from '../../../../lib/kv';

export async function GET(request) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const usernames = await listUsernames();
  return NextResponse.json({ usernames });
}

export async function POST(request) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const { username, password } = await request.json().catch(() => ({}));
  const clean = normalizeUsername(username);

  if (!clean || clean.length < 3) {
    return NextResponse.json(
      { error: 'Username must be at least 3 characters (letters, numbers, - and _ only).' },
      { status: 400 }
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    await createUser(clean, passwordHash);
    return NextResponse.json({ ok: true, username: clean });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not create that account' }, { status: 400 });
  }
}

export async function DELETE(request) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const { username } = await request.json().catch(() => ({}));
  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }
  await deleteUser(username);
  return NextResponse.json({ ok: true });
}
