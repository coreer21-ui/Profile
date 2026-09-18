import { NextResponse } from 'next/server';
import { getUserFromRequestCookies } from '../../../../lib/session';
import { getUserRecord, saveUserRecord } from '../../../../lib/kv';
import { withDefaults, mergeBadgesForSelfSave } from '../../../../lib/defaultProfile';

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
  if (record.suspended) return NextResponse.json({ error: 'This account is suspended' }, { status: 403 });

  // Never trust a username/passwordHash from the client — always write to the
  // session's own record, and only ever touch the `profile` sub-object.
  const incoming = withDefaults(body, username);
  // Official/catalog badges are admin-granted only. A self-save can never add
  // or remove one, even by editing the request body directly — the existing
  // catalog badges are always carried over, and only custom badges come from
  // what the user submitted.
  incoming.badges = mergeBadgesForSelfSave(record.profile?.badges, incoming.badges);

  record.profile = incoming;
  record.updatedAt = new Date().toISOString();
  await saveUserRecord(username, record);

  return NextResponse.json({ ok: true });
}
