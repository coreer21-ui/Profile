import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getUserRecord, normalizeUsername, incrementViewCount } from '../../lib/kv';
import { withDefaults } from '../../lib/defaultProfile';
import { getUserFromCookieStore, isAdminFromCookieStore } from '../../lib/session';
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
  const isAdminViewer = isAdminFromCookieStore(cookieStore);

  if (record.suspended && !isAdminViewer) {
    return (
      <div className="app-shell">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Page unavailable</h1>
          <p className="sub">This page has been suspended.</p>
        </div>
      </div>
    );
  }

  // Best-effort view count — skip the owner's own visits and admin previews
  // so the number reflects real traffic, not you checking your own page.
  if (!isOwner && !isAdminViewer) {
    incrementViewCount(clean).catch(() => {});
  }

  return <ProfileView username={clean} profile={profile} isOwner={isOwner} />;
}
