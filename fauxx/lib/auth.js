import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SECRET = process.env.SESSION_SECRET || '';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

if (!SECRET && process.env.NODE_ENV === 'production') {
  // Fails loudly at request time (via sign/verify) rather than silently
  // issuing forgeable sessions if the env var was never set.
  console.error('SESSION_SECRET is not set — sessions cannot be signed safely.');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

function hmac(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

// Session token shape: base64(payloadJSON).hmacHex
// payload = { sub: username, role: 'user'|'admin', exp: unixSeconds }
export function signSession(payload) {
  const full = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = hmac(encoded);
  return `${encoded}.${sig}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = hmac(encoded);
  // constant-time compare
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'gb_session';
export const ADMIN_COOKIE = 'gb_admin';
export const COOKIE_MAX_AGE = MAX_AGE_SECONDS;
