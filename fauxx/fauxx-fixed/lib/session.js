import { verifySession, SESSION_COOKIE, ADMIN_COOKIE } from './auth';

// For Route Handlers (Request-based).
export function getUserFromRequestCookies(request) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(raw);
  if (!payload || payload.role !== 'user') return null;
  return payload.sub;
}

export function isAdminFromRequestCookies(request) {
  const raw = request.cookies.get(ADMIN_COOKIE)?.value;
  const payload = verifySession(raw);
  return !!payload && payload.role === 'admin';
}

// For Server Components (next/headers cookies()).
export function getUserFromCookieStore(cookieStore) {
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = verifySession(raw);
  if (!payload || payload.role !== 'user') return null;
  return payload.sub;
}

export function isAdminFromCookieStore(cookieStore) {
  const raw = cookieStore.get(ADMIN_COOKIE)?.value;
  const payload = verifySession(raw);
  return !!payload && payload.role === 'admin';
}
