import { useState, useEffect, createContext, useContext } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import api from './api';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function ChangePasswordScreen({ user, onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (pw.length < 6) return setErr('Password must be at least 6 characters');
    if (pw !== pw2) return setErr('Passwords do not match');
    setSaving(true);
    try {
      const r = await api.put('/auth/change-password', { new_password: pw });
      onDone(r.data.token, r.data.user);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to change password');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1c30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#213145' }}>lock_reset</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#213145', margin: '8px 0 4px' }}>Set New Password</h2>
          <p style={{ fontSize: 13, color: '#666' }}>Welcome, {user.staff_name || user.username}! Set a new password before continuing.</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>New Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min 6 characters" autoFocus />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat password" />
          </div>
          {err && <p style={{ color: '#dc2626', fontSize: 13 }}>{err}</p>}
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('karekat_token');
    const userData = localStorage.getItem('karekat_user');
    if (token && userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('karekat_token', token);
    localStorage.setItem('karekat_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('karekat_token');
    localStorage.removeItem('karekat_user');
    setUser(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f0' }}>
      <div style={{ color: '#888', fontSize: 14 }}>Loading...</div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!user
        ? <Login />
        : user.must_change_password
          ? <ChangePasswordScreen user={user} onDone={login} />
          : <Layout />
      }
    </AuthContext.Provider>
  );
}
