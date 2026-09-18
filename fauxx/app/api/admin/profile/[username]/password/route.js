import { NextResponse } from 'next/server';
import { isAdminFromRequestCookies } from '../../../../../../lib/session';
import { getUserRecord, saveUserRecord, normalizeUsername } from '../../../../../../lib/kv';
import { hashPassword } from '../../../../../../lib/auth';

export async function POST(request, { params }) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const username = normalizeUsername(params.username);
  const { newPassword } = await request.json().catch(() => ({}));

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const record = await getUserRecord(username);
  if (!record) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  record.passwordHash = await hashPassword(newPassword);
  await saveUserRecord(username, record);
  return NextResponse.json({ ok: true });
}
