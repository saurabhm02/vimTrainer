import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types/models';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { user, access_token } = res.data.data as { user: User; access_token: string };
      setUser(user);
      setAccessToken(access_token);
      navigate('/practice');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-term">
        <div className="auth-term__header">
          <span className="auth-term__logo"><span className="auth-term__logo-acc">vim</span>trainer</span>
          <span className="buf-comment">-- login</span>
        </div>

        <div className="auth-term__rule" />

        <form className="auth-term__form" onSubmit={handleSubmit}>
          <div className="auth-term__row">
            <label className="auth-term__label" htmlFor="email">email</label>
            <input
              id="email"
              type="email"
              className="auth-term__input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="auth-term__row">
            <label className="auth-term__label" htmlFor="password">password</label>
            <input
              id="password"
              type="password"
              className="auth-term__input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="auth-term__error">{error}</div>}

          <div className="auth-term__rule" />

          <button type="submit" className="auth-term__submit" disabled={loading}>
            {loading ? 'signing in…' : 'sign in'}
          </button>

          <div className="auth-term__footer">
            <span className="buf-dim">no account?</span>{' '}
            <Link to="/auth/register" className="auth-term__link">create one</Link>
            {'  ·  '}
            <Link to="/editor" className="auth-term__link">practice as guest</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
