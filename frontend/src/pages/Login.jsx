import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

function PlaneIcon() {
  return (
    <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

const LOCKOUT_KEY = 'login_blocked_until';
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getLockoutRemaining() {
  const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
  const remaining = until - Date.now();
  return remaining > 0 ? remaining : 0;
}

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedMs, setBlockedMs] = useState(getLockoutRemaining);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('token')) navigate('/admin', { replace: true });
  }, [navigate]);

  // Countdown tick
  useEffect(() => {
    if (blockedMs <= 0) return;
    const id = setInterval(() => {
      const rem = getLockoutRemaining();
      setBlockedMs(rem);
      if (rem <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [blockedMs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rem = getLockoutRemaining();
    if (rem > 0) { setBlockedMs(rem); return; }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.removeItem(LOCKOUT_KEY);
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('username', data.username);
      navigate('/admin');
    } catch (err) {
      // Block after 1 failed attempt
      const until = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOCKOUT_KEY, String(until));
      setBlockedMs(LOCKOUT_DURATION_MS);
      setError(err.response?.data?.error || 'Login failed. This browser is now blocked for 1 hour.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500/15 border border-blue-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PlaneIcon />
          </div>
          <h1 className="text-2xl font-bold text-white">Aviation Updates</h1>
          <p className="mt-1 text-slate-500 text-sm">Admin sign in</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          {blockedMs > 0 ? (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">🔒</div>
              <p className="text-red-400 font-semibold text-sm">Access blocked</p>
              <p className="text-slate-400 text-sm">Too many failed attempts.</p>
              <p className="text-slate-500 text-xs">
                Try again in{' '}
                <span className="text-white font-mono font-bold">
                  {Math.floor(blockedMs / 60000)}:{String(Math.floor((blockedMs % 60000) / 1000)).padStart(2, '0')}
                </span>
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
                autoComplete="username"
                placeholder="admin"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Link to="/" className="hover:text-slate-400 transition-colors">← Back to public view</Link>
        </p>
      </div>
    </div>
  );
}
