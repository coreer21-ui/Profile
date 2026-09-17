import { NextResponse } from 'next/server';
import { getUserFromRequestCookies } from '../../../../lib/session';
import { getUserRecord, saveUserRecord } from '../../../../lib/kv';
import { withDefaults } from '../../../../lib/defaultProfile';

export async function GET(request) {
  const username = getUserFromRequestCookies(request);
  if (!username) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const record = await getUserRecord(username);
  if (!record) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  return NextResponse.json({ username, profile: withDefaults(record.profile, username) });
}

export async function POST(request) {
  const username = getUserFromRequestCookies(request);
  if (!username) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 });
  }

  const record = await getUserRecord(username);
  if (!record) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Never trust a username/passwordHash from the client — always write to the
  // session's own record, and only ever touch the `profile` sub-object.
  record.profile = withDefaults(body, username);
  await saveUserRecord(username, record);

  return NextResponse.json({ ok: true });
}
