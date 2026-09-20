import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUserFromRequestCookies, isAdminFromRequestCookies } from '../../../lib/session';
import { normalizeUsername } from '../../../lib/kv';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file
const ALLOWED_FIELDS = new Set(['background', 'avatar', 'audio', 'cursor', 'font', 'gallery']);

export async function POST(request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const field = formData?.get('field');

  // A normal user always uploads to their own namespace. An admin editing
  // someone else's page on their behalf must say whose page it's for.
  const selfUsername = getUserFromRequestCookies(request);
  let username = selfUsername;
  if (!username && isAdminFromRequestCookies(request)) {
    username = normalizeUsername(formData?.get('username'));
  }
  if (!username) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file received' }, { status: 400 });
  }
  if (!ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is over 8MB' }, { status: 400 });
  }

  const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '');
  const path = `${username}/${field}-${Date.now()}-${safeName}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: false
  });

  return NextResponse.json({ ok: true, url: blob.url });
}
