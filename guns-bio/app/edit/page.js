import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromCookieStore } from '../../lib/session';
import ProfileEditor from '../../components/ProfileEditor';

export default function EditPage() {
  const username = getUserFromCookieStore(cookies());
  if (!username) redirect('/login');
  return <ProfileEditor username={username} />;
}
