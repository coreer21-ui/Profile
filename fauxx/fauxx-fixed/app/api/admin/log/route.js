import { NextResponse } from 'next/server';
import { isAdminFromRequestCookies } from '../../../../lib/session';
import { getAdminLog } from '../../../../lib/kv';

export async function GET(request) {
  if (!isAdminFromRequestCookies(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const log = await getAdminLog(50);
  return NextResponse.json({ log });
}
