import { kv } from '@vercel/kv';
import { defaultProfile } from './defaultProfile';

const USER_KEY = (username) => `user:${username.toLowerCase()}`;
const VIEWS_KEY = (username) => `views:${username.toLowerCase()}`;
const ALL_USERS_KEY = 'users:all';

export function normalizeUsername(raw) {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export async function getUserRecord(username) {
  const key = USER_KEY(normalizeUsername(username));
  const record = await kv.get(key);
  return record || null;
}

export async function saveUserRecord(username, record) {
  const key = USER_KEY(normalizeUsername(username));
  await kv.set(key, record);
}

export async function createUser(username, passwordHash) {
  const clean = normalizeUsername(username);
  if (!clean) throw new Error('Invalid username');
  const existing = await getUserRecord(clean);
  if (existing) throw new Error('That username is already taken');
  const now = new Date().toISOString();
  const record = {
    username: clean,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    suspended: false,
    profile: defaultProfile(clean)
  };
  await saveUserRecord(clean, record);
  await kv.sadd(ALL_USERS_KEY, clean);
  return record;
}

export async function listUsernames() {
  const members = await kv.smembers(ALL_USERS_KEY);
  return (members || []).sort();
}

// Richer listing for the admin dashboard: one record + view count per user.
// Fine at friend-group scale; would want a different shape (a secondary
// index) if this ever needs to list hundreds of users.
export async function listUserSummaries() {
  const usernames = await listUsernames();
  const summaries = await Promise.all(
    usernames.map(async (username) => {
      const [record, views] = await Promise.all([getUserRecord(username), kv.get(VIEWS_KEY(username))]);
      if (!record) return null;
      return {
        username,
        displayName: record.profile?.general?.displayName || username,
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null,
        suspended: !!record.suspended,
        views: views || 0,
        badgeCount: (record.profile?.badges || []).filter((b) => b.type === 'catalog').length
      };
    })
  );
  return summaries.filter(Boolean);
}

export async function deleteUser(username) {
  const clean = normalizeUsername(username);
  await kv.del(USER_KEY(clean));
  await kv.del(VIEWS_KEY(clean));
  await kv.srem(ALL_USERS_KEY, clean);
}

export async function setSuspended(username, suspended) {
  const record = await getUserRecord(username);
  if (!record) throw new Error('Account not found');
  record.suspended = !!suspended;
  await saveUserRecord(username, record);
  return record;
}

export async function incrementViewCount(username) {
  try {
    await kv.incr(VIEWS_KEY(username));
  } catch {
    // View counting is best-effort — never let it break the page render.
  }
}

export async function getViewCount(username) {
  const v = await kv.get(VIEWS_KEY(normalizeUsername(username)));
  return v || 0;
}
