import { NextResponse } from 'next/server';
import { isAdminFromRequestCookies } from '../../../../../../lib/session';
import { setSuspended, normalizeUsername } from '../../../../../../lib/kv';

export async function POST(request, { params }) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const username = normalizeUsername(params.username);
  const { suspended } = await request.json().catch(() => ({}));

  try {
    await setSuspended(username, !!suspended);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not update account' }, { status: 400 });
  }
}
