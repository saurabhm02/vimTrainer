import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types/models';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register({ email, password, display_name: displayName });
      const { user, access_token } = res.data.data as { user: User; access_token: string };
      setUser(user);
      setAccessToken(access_token);
      navigate('/practice');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-term">
        <div className="auth-term__header">
          <span className="auth-term__logo"><span className="auth-term__logo-acc">vim</span>trainer</span>
          <span className="buf-comment">-- create account</span>
        </div>

        <div className="auth-term__rule" />

        <form className="auth-term__form" onSubmit={handleSubmit}>
          <div className="auth-term__row">
            <label className="auth-term__label" htmlFor="display-name">name</label>
            <input
              id="display-name"
              type="text"
              className="auth-term__input"
              placeholder="nvim_wizard"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

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
              required
            />
          </div>

          <div className="auth-term__row">
            <label className="auth-term__label" htmlFor="password">password</label>
            <input
              id="password"
              type="password"
              className="auth-term__input"
              placeholder="min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && <div className="auth-term__error">{error}</div>}

          <div className="auth-term__rule" />

          <button type="submit" className="auth-term__submit" disabled={loading}>
            {loading ? 'creating account…' : 'create account'}
          </button>

          <div className="auth-term__footer">
            <span className="buf-dim">already have an account?</span>{' '}
            <Link to="/auth/login" className="auth-term__link">sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
