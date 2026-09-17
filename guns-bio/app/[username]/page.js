import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getUserRecord, normalizeUsername } from '../../lib/kv';
import { withDefaults } from '../../lib/defaultProfile';
import { getUserFromCookieStore } from '../../lib/session';
import ProfileView from '../../components/ProfileView';

// Reserved paths that must never be swallowed by the [username] catch-all.
const RESERVED = new Set(['login', 'admin', 'edit', 'api', 'favicon.ico']);

export async function generateMetadata({ params }) {
  const clean = normalizeUsername(params.username);
  if (RESERVED.has(clean)) return {};
  const record = await getUserRecord(clean);
  if (!record) return {};
  const profile = withDefaults(record.profile, clean);
  return { title: profile.general.displayName || clean };
}

export default async function ProfilePage({ params }) {
  const clean = normalizeUsername(params.username);
  if (RESERVED.has(clean)) notFound();

  const record = await getUserRecord(clean);
  if (!record) notFound();

  const profile = withDefaults(record.profile, clean);
  const cookieStore = cookies();
  const viewer = getUserFromCookieStore(cookieStore);
  const isOwner = viewer === clean;

  return <ProfileView username={clean} profile={profile} isOwner={isOwner} />;
}
