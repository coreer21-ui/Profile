export default function Home() {
  return (
    <div className="app-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>guns-bio</h1>
        <p className="sub">Private bio-page host. Your page lives at /your-username.</p>
        <a className="btn btn-primary" href="/login" style={{ display: 'block', textDecoration: 'none' }}>
          Log in to edit your page
        </a>
      </div>
    </div>
  );
}
