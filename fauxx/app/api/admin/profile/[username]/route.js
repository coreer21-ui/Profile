import { NextResponse } from 'next/server';
import { isAdminFromRequestCookies } from '../../../../../lib/session';
import { getUserRecord, saveUserRecord, normalizeUsername, logAdminAction } from '../../../../../lib/kv';
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

function catalogBadgeIds(badges) {
  return new Set((badges || []).filter((b) => b?.type === 'catalog').map((b) => b.id));
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

  const before = catalogBadgeIds(record.profile?.badges);

  // Admin has full authority — including catalog badges — so no badge
  // restriction here, unlike the self-service save route.
  record.profile = withDefaults(body, username);
  record.updatedAt = new Date().toISOString();
  await saveUserRecord(username, record);

  const after = catalogBadgeIds(record.profile.badges);
  for (const id of after) {
    if (!before.has(id)) await logAdminAction('badge_grant', username, id);
  }
  for (const id of before) {
    if (!after.has(id)) await logAdminAction('badge_revoke', username, id);
  }

  return NextResponse.json({ ok: true });
}
