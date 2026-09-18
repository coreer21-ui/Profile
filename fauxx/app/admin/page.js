'use client';
import { useEffect, useState } from 'react';
import { BADGE_CATALOG } from '../../lib/defaultProfile';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createdInfo, setCreatedInfo] = useState('');
  const [expanded, setExpanded] = useState(null);

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setAuthed(true);
    } else {
      setAuthed(false);
    }
    setChecking(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function submitAdminLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'Incorrect password');
      return;
    }
    setPassword('');
    loadUsers();
  }

  async function createUser(e) {
    e.preventDefault();
    setCreateError('');
    setCreatedInfo('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error || 'Could not create account');
      return;
    }
    setCreatedInfo(`Created "${data.username}" — share the username and password with them directly.`);
    setNewUsername('');
    setNewPassword('');
    loadUsers();
  }

  async function removeUser(username) {
    if (!confirm(`Delete ${username}'s account and page? This can't be undone.`)) return;
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (expanded === username) setExpanded(null);
    loadUsers();
  }

  async function toggleSuspend(username, currentlySuspended) {
    await fetch(`/api/admin/profile/${username}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !currentlySuspended })
    });
    loadUsers();
  }

  if (checking) return <div className="app-shell" />;

  if (!authed) {
    return (
      <div className="app-shell">
        <form className="auth-card" onSubmit={submitAdminLogin}>
          <h1>Admin</h1>
          <p className="sub">Enter the admin password to manage accounts.</p>
          <div className="field">
            <label>Admin password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ alignItems: 'flex-start', paddingTop: '60px' }}>
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <h1>Manage accounts</h1>
        <p className="sub">Create pages, grant official badges, suspend, or reset passwords.</p>

        <form onSubmit={createUser} style={{ marginBottom: 28 }}>
          <div className="row">
            <div className="field">
              <label>Username</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. sam" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="temp password" />
            </div>
          </div>
          {createError && <p className="error-text">{createError}</p>}
          {createdInfo && <p className="hint-text" style={{ marginBottom: 12 }}>{createdInfo}</p>}
          <button className="btn btn-primary" type="submit">Create account</button>
        </form>

        <div className="section-title">Existing pages ({users.length})</div>
        {users.length === 0 && <p className="hint-text">No accounts yet.</p>}
        {users.map((u) => (
          <UserRow
            key={u.username}
            summary={u}
            isOpen={expanded === u.username}
            onToggleOpen={() => setExpanded(expanded === u.username ? null : u.username)}
            onRemove={() => removeUser(u.username)}
            onToggleSuspend={() => toggleSuspend(u.username, u.suspended)}
            onChanged={loadUsers}
          />
        ))}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function UserRow({ summary, isOpen, onToggleOpen, onRemove, onToggleSuspend, onChanged }) {
  const { username, displayName, createdAt, updatedAt, suspended, views, badgeCount } = summary;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <button
          type="button"
          onClick={onToggleOpen}
          style={{ background: 'none', border: 'none', color: 'var(--icon)', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          {isOpen ? '▾' : '▸'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={`/${username}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>
            /{username}
          </a>
          {displayName && displayName !== username && <span className="hint-text"> — {displayName}</span>}
          {suspended && <span className="badge" style={{ marginLeft: 8, color: 'var(--danger)', borderColor: 'var(--danger)' }}>Suspended</span>}
        </div>
        <span className="hint-text" style={{ whiteSpace: 'nowrap' }}>{views ?? 0} views</span>
        <span className="hint-text" style={{ whiteSpace: 'nowrap' }}>{badgeCount ?? 0} badges</span>
        <span className="hint-text" style={{ whiteSpace: 'nowrap' }}>edited {timeAgo(updatedAt)}</span>
        <button className="btn btn-sm" onClick={onToggleSuspend}>{suspended ? 'Unsuspend' : 'Suspend'}</button>
        <button className="btn btn-sm btn-danger" onClick={onRemove}>Delete</button>
      </div>
      {isOpen && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'rgba(255,255,255,.02)' }}>
          <p className="hint-text" style={{ marginBottom: 10 }}>Account created {new Date(createdAt).toLocaleDateString()}</p>
          <BadgeManager username={username} onChanged={onChanged} />
          <PasswordResetter username={username} />
        </div>
      )}
    </div>
  );
}

function BadgeManager({ username, onChanged }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`/api/admin/profile/${username}`)
      .then((r) => r.json())
      .then((data) => { setProfile(data.profile); setLoading(false); })
      .catch(() => setLoading(false));
  }, [username]);

  async function toggle(cat) {
    if (!profile || saving) return;
    const badges = profile.badges || [];
    const exists = badges.some((b) => b.type === 'catalog' && b.id === cat.id);
    const nextBadges = exists
      ? badges.filter((b) => !(b.type === 'catalog' && b.id === cat.id))
      : [...badges, { type: 'catalog', id: cat.id, label: cat.label, icon: cat.icon }];
    const nextProfile = { ...profile, badges: nextBadges };
    setProfile(nextProfile);
    setSaving(true);
    setStatus('');
    const res = await fetch(`/api/admin/profile/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextProfile)
    });
    setSaving(false);
    if (res.ok) {
      setStatus('Saved');
      onChanged();
    } else {
      setStatus('Could not save');
    }
  }

  if (loading) return <p className="hint-text">Loading badges…</p>;
  if (!profile) return <p className="error-text">Could not load this profile.</p>;

  const badges = profile.badges || [];

  return (
    <div style={{ marginBottom: 16 }}>
      <label>Official badges (only you can grant these)</label>
      <div className="badge-catalog" style={{ marginTop: 8 }}>
        {BADGE_CATALOG.map((cat) => {
          const active = badges.some((b) => b.type === 'catalog' && b.id === cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              className={'catalog-chip' + (active ? ' active' : '')}
              onClick={() => toggle(cat)}
              disabled={saving}
            >
              <span>{cat.icon}</span><span>{cat.label}</span>
            </button>
          );
        })}
      </div>
      {status && <span className="hint-text">{status}</span>}
    </div>
  );
}

function PasswordResetter({ username }) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (value.length < 6) { setStatus('Use at least 6 characters'); return; }
    setBusy(true);
    setStatus('');
    const res = await fetch(`/api/admin/profile/${username}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: value })
    });
    setBusy(false);
    if (res.ok) { setStatus('Password updated — share it with them.'); setValue(''); }
    else { setStatus('Could not update password'); }
  }

  return (
    <div>
      <label>Reset their password</label>
      <div className="upload-row" style={{ marginTop: 8 }}>
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="new password" style={{ maxWidth: 200 }} />
        <button className="btn btn-sm" onClick={reset} disabled={busy}>{busy ? 'Saving…' : 'Set password'}</button>
      </div>
      {status && <p className="hint-text" style={{ marginTop: 6 }}>{status}</p>}
    </div>
  );
}
