import Redis from 'ioredis';
import { defaultProfile } from './defaultProfile';

const USER_KEY = (username) => `user:${username.toLowerCase()}`;
const ALL_USERS_KEY = 'users:all';

// Reuse one connection across invocations (important in dev with hot-reload,
// and avoids opening a fresh connection on every serverless invocation).
function getClient() {
  if (!global.__redisClient) {
    global.__redisClient = new Redis(process.env.REDIS_URL);
  }
  return global.__redisClient;
}

export function normalizeUsername(raw) {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export async function getUserRecord(username) {
  const redis = getClient();
  const key = USER_KEY(normalizeUsername(username));
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUserRecord(username, record) {
  const redis = getClient();
  const key = USER_KEY(normalizeUsername(username));
  await redis.set(key, JSON.stringify(record));
}

export async function createUser(username, passwordHash) {
  const redis = getClient();
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
  await redis.sadd(ALL_USERS_KEY, clean);
  return record;
}

export async function listUsernames() {
  const redis = getClient();
  const members = await redis.smembers(ALL_USERS_KEY);
  return (members || []).sort();
}

export async function deleteUser(username) {
  const redis = getClient();
  const clean = normalizeUsername(username);
  await redis.del(USER_KEY(clean));
  await redis.srem(ALL_USERS_KEY, clean);
}
