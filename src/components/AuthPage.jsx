import { useState } from 'react';
import { registerUser, loginUser } from '../db/database';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isLogin) {
      if (!form.name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      let userData;
      if (isLogin) {
        userData = await loginUser(form.email, form.password);
      } else {
        userData = await registerUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      }
      login(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsLogin(!isLogin);
    setError('');
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  }

  return (
    <div className="auth-page-simple">
      <div className="auth-card-simple card">
        <div className="auth-header-simple">
          <div className="auth-logo-simple">
            <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>💰</span>
            <h1>FinTracker</h1>
          </div>
          <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
          <p className="text-muted">{isLogin ? 'Welcome back, please sign in to continue' : 'Sign up to start tracking your finances'}</p>
        </div>

        {error && (
          <div className="auth-error-simple" style={{ background: 'rgba(225, 29, 72, 0.1)', color: 'var(--accent-rose)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', fontSize: '0.9rem', borderLeft: '3px solid var(--accent-rose)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-simple">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={isLogin ? "Enter your password" : "At least 6 characters"}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <input
                id="auth-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Type password again"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-md)', padding: '12px' }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-switch-simple">
          {isLogin ? (
            <p>
              New here? <button type="button" onClick={switchMode} className="btn-link">Create an account</button>
            </p>
          ) : (
            <p>
              Already have an account? <button type="button" onClick={switchMode} className="btn-link">Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
