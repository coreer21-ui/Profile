import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromCookieStore } from '../../lib/session';
import { getUserRecord } from '../../lib/kv';
import ProfileEditor from '../../components/ProfileEditor';

export default async function EditPage() {
  const username = getUserFromCookieStore(cookies());
  if (!username) redirect('/login');

  const record = await getUserRecord(username);
  if (!record) redirect('/login');

  if (record.suspended) {
    return (
      <div className="app-shell">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Account suspended</h1>
          <p className="sub">
            Your page has been suspended by the site admin, so it isn&apos;t visible and can&apos;t be edited right now.
            Reach out to them directly if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileEditor username={username} />;
}
