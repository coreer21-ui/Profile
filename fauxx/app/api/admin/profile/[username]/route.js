import { NextResponse } from 'next/server';
import { isAdminFromRequestCookies } from '../../../../../lib/session';
import { getUserRecord, saveUserRecord, normalizeUsername } from '../../../../../lib/kv';
import { withDefaults } from '../../../../../lib/defaultProfile';

export async function GET(request, { params }) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const username = normalizeUsername(params.username);
  const record = await getUserRecord(username);
  if (!record) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  return NextResponse.json({ username, profile: withDefaults(record.profile, username) });
}

export async function POST(request, { params }) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const username = normalizeUsername(params.username);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 });
  }

  const record = await getUserRecord(username);
  if (!record) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Admin has full authority — including catalog badges — so no badge
  // restriction here, unlike the self-service save route.
  record.profile = withDefaults(body, username);
  record.updatedAt = new Date().toISOString();
  await saveUserRecord(username, record);

  return NextResponse.json({ ok: true });
}
