import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api, saveSession, getToken } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getToken()) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('login.php', { method: 'POST', body: { email, password } });
      saveSession(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-mark large">SB</div>
        <h1>Stewols Bansal</h1>
        <p>Sales CRM — every inquiry, every follow-up, in one place.</p>
        <ul>
          <li>Google Ads and website leads, separated</li>
          <li>Auto-assigned to the right salesperson</li>
          <li>Status tracking and follow-up notes</li>
        </ul>
      </div>

      <div className="login-form-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="muted">Use your CRM email and password</p>

          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error && <div className="alert error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}