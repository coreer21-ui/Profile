import { kv } from '@vercel/kv';
import { defaultProfile } from './defaultProfile';

const USER_KEY = (username) => `user:${username.toLowerCase()}`;
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
  const record = {
    username: clean,
    passwordHash,
    createdAt: new Date().toISOString(),
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

export async function deleteUser(username) {
  const clean = normalizeUsername(username);
  await kv.del(USER_KEY(clean));
  await kv.srem(ALL_USERS_KEY, clean);
}
