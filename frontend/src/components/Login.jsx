import { useState } from 'react';
import api from '../api';
import { useAuth } from '../App';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-md">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-container/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-inverse-surface mb-md shadow-modal">
            <span className="material-symbols-outlined text-white text-3xl">local_printshop</span>
          </div>
          <h1 className="text-headline-md text-on-background font-bold">KarekatOS</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-card p-lg">
          {error && (
            <div className="flex items-center gap-sm p-sm bg-error-container rounded-lg mb-md">
              <span className="material-symbols-outlined text-on-error-container" style={{ fontSize: 18 }}>error</span>
              <p className="text-body-sm text-on-error-container">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-sm">
            <div className="field">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handle}
                placeholder="owner or staff first name"
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handle}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary justify-center mt-sm py-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Hint */}
        <div className="mt-md p-sm bg-surface-container border border-outline-variant rounded-xl text-label-sm text-on-surface-variant space-y-xs">
          <p className="font-semibold text-on-surface">Default credentials</p>
          <p><span className="font-semibold text-primary-container">Owner:</span> owner / karekat2024</p>
          <p><span className="font-semibold text-secondary">Staff:</span> arun, fathima, suresh… / staff2024</p>
        </div>
      </div>
    </div>
  );
}
