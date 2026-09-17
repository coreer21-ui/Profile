'use client';
import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [usernames, setUsernames] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createdInfo, setCreatedInfo] = useState('');

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsernames(data.usernames || []);
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
    loadUsers();
  }

  if (checking) {
    return <div className="app-shell" />;
  }

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
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h1>Manage accounts</h1>
        <p className="sub">Create a page for a friend, or remove one.</p>

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

        <div className="section-title">Existing pages ({usernames.length})</div>
        {usernames.length === 0 && <p className="hint-text">No accounts yet.</p>}
        {usernames.map((u) => (
          <div key={u} className="list-item">
            <a href={`/${u}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none' }}>
              /{u}
            </a>
            <button className="btn btn-sm btn-danger" onClick={() => removeUser(u)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
