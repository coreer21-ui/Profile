import { NextResponse } from 'next/server';
import { getUserFromRequestCookies } from '../../../../lib/session';
import { getUserRecord, saveUserRecord } from '../../../../lib/kv';
import { hashPassword, verifyPassword } from '../../../../lib/auth';

export async function POST(request) {
  const username = getUserFromRequestCookies(request);
  if (!username) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json().catch(() => ({}));
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const record = await getUserRecord(username);
  if (!record) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const ok = await verifyPassword(currentPassword || '', record.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  record.passwordHash = await hashPassword(newPassword);
  await saveUserRecord(username, record);
  return NextResponse.json({ ok: true });
}
