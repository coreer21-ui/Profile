import { createClient } from 'redis';
import { defaultProfile } from './defaultProfile';

const USER_KEY = (username) => `user:${username.toLowerCase()}`;
const VIEWS_KEY = (username) => `views:${username.toLowerCase()}`;
const ALL_USERS_KEY = 'users:all';

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on('error', (err) => {
  console.error('Redis Client Error', err);
});

let connectionPromise;

async function getRedis() {
  if (!connectionPromise) {
    connectionPromise = redis.connect();
  }

  await connectionPromise;
  return redis;
}

function parseValue(value) {
  if (value === null || value === undefined) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeUsername(raw) {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export async function getUserRecord(username) {
  const client = await getRedis();
  const key = USER_KEY(normalizeUsername(username));
  const record = await client.get(key);
  return parseValue(record);
}

export async function saveUserRecord(username, record) {
  const client = await getRedis();
  const key = USER_KEY(normalizeUsername(username));
  await client.set(key, JSON.stringify(record));
}

export async function createUser(username, passwordHash) {
  const clean = normalizeUsername(username);

  if (!clean) {
    throw new Error('Invalid username');
  }

  const existing = await getUserRecord(clean);

  if (existing) {
    throw new Error('That username is already taken');
  }

  const now = new Date().toISOString();

  const record = {
    username: clean,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    suspended: false,
    profile: defaultProfile(clean),
  };

  await saveUserRecord(clean, record);

  const client = await getRedis();
  await client.sAdd(ALL_USERS_KEY, clean);

  return record;
}

export async function listUsernames() {
  const client = await getRedis();
  const members = await client.sMembers(ALL_USERS_KEY);

  return (members || []).sort();
}

export async function listUserSummaries() {
  const usernames = await listUsernames();

  const summaries = await Promise.all(
    usernames.map(async (username) => {
      const [record, views] = await Promise.all([
        getUserRecord(username),
        getViewCount(username),
      ]);

      if (!record) return null;

      return {
        username,
        displayName:
          record.profile?.general?.displayName || username,
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null,
        suspended: !!record.suspended,
        views: views || 0,
        badgeCount: (record.profile?.badges || []).filter(
          (b) => b.type === 'catalog'
        ).length,
      };
    })
  );

  return summaries.filter(Boolean);
}

export async function deleteUser(username) {
  const client = await getRedis();
  const clean = normalizeUsername(username);

  await client.del(USER_KEY(clean));
  await client.del(VIEWS_KEY(clean));
  await client.sRem(ALL_USERS_KEY, clean);
}

export async function setSuspended(username, suspended) {
  const record = await getUserRecord(username);

  if (!record) {
    throw new Error('Account not found');
  }

  record.suspended = !!suspended;

  await saveUserRecord(username, record);

  return record;
}

export async function incrementViewCount(username) {
  try {
    const client = await getRedis();
    await client.incr(VIEWS_KEY(username));
  } catch {
    // View counting is best-effort.
  }
}

export async function getViewCount(username) {
  const client = await getRedis();
  const value = await client.get(
    VIEWS_KEY(normalizeUsername(username))
  );

  return value ? Number(value) : 0;
}
