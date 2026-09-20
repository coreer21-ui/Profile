import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SECRET = process.env.SESSION_SECRET || '';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function requireSecret() {
  if (!SECRET) {
    // Thrown at request time (not at module load) so a missing secret fails
    // the specific request loudly instead of silently signing/verifying
    // sessions with an empty, guessable HMAC key.
    throw new Error('SESSION_SECRET is not set — refusing to sign or verify sessions.');
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// A syntactically valid bcrypt hash that matches no real password. Used so
// login always pays the same bcrypt cost whether or not the username
// exists — otherwise a nonexistent user returns measurably faster than a
// wrong password, which leaks which usernames are registered.
const DUMMY_HASH = bcrypt.hashSync('no-such-user-timing-guard', 10);
export async function verifyPasswordTimingSafe(password, hash) {
  return verifyPassword(password, hash || DUMMY_HASH);
}

function hmac(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

// Session token shape: base64(payloadJSON).hmacHex
// payload = { sub: username, role: 'user'|'admin', exp: unixSeconds }
export function signSession(payload) {
  requireSecret(); // refuse to issue a session rather than sign it with an empty key
  const full = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = hmac(encoded);
  return `${encoded}.${sig}`;
}

export function verifySession(token) {
  if (!SECRET) return null; // fail safe: no secret means nobody is verified, not a crashed page
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
