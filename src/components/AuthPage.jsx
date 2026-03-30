import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser } from '../db/database';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: '🔓',
    title: '100% Open Source',
    desc: 'Fully transparent codebase. Inspect, modify, and self-host — your finances, your rules.',
  },
  {
    icon: '🏠',
    title: 'Local-First Data',
    desc: 'All data stays on your device. Nothing is sent to external servers — ever.',
  },
  {
    icon: '🔔',
    title: 'Smart Reminders',
    desc: 'Never miss a payment or receivable. Set due dates and track them at a glance.',
  },
  {
    icon: '🚫',
    title: 'No Third-Party Sharing',
    desc: 'We don\'t collect, sell, or share your data with anyone. Zero tracking, zero ads.',
  },
  {
    icon: '📊',
    title: 'Visual Insights',
    desc: 'Interactive dashboards and charts to understand your spending patterns instantly.',
  },
  {
    icon: '⚠️',
    title: 'You Own Your Data',
    desc: 'You are solely responsible for the data you enter. Export anytime, delete anytime.',
  },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

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
    setTermsAccepted(false);
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  }

  return (
    <div className="auth-page-split">
      {/* ─── Left Panel: Info & Features ─── */}
      <div className="auth-info-panel">
        <div className="auth-info-inner">
          <div className="auth-info-brand">
            <span className="auth-info-logo-icon">💰</span>
            <h1>FinTracker</h1>
          </div>
          <p className="auth-info-tagline">
            The open-source personal finance tracker with smart reminders.
            <br />
            <strong>Your money. Your data. Your control.</strong>
          </p>

          <div className="auth-features-grid">
            {FEATURES.map((f, i) => (
              <div className="auth-feature-card" key={i}>
                <span className="auth-feature-icon">{f.icon}</span>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-info-sec-banner">
            <div className="auth-sec-badge-row">
              <span className="auth-sec-badge">🛡️ SEC-Compliant Practices</span>
              <span className="auth-sec-badge">🔐 Hashed Passwords</span>
              <span className="auth-sec-badge">📦 Export Anytime</span>
            </div>
            <p className="auth-sec-text">
              FinTracker follows security best practices inspired by SEC guidelines
              for financial data handling. All data is encrypted locally, passwords
              are never stored in plain text, and our open-source codebase is
              publicly auditable.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Auth Form ─── */}
      <div className="auth-form-panel">
        <div className="auth-card-split card">
          <div className="auth-header-simple">
            <div className="auth-logo-simple auth-logo-mobile">
              <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>💰</span>
              <h1>FinTracker</h1>
            </div>
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-muted">
              {isLogin
                ? 'Sign in to manage your finances securely'
                : 'Get started — it\'s free and open source'}
            </p>
          </div>

          {error && (
            <div
              className="auth-error-simple"
              style={{
                background: 'rgba(225, 29, 72, 0.1)',
                color: 'var(--accent-rose)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-md)',
                fontSize: '0.9rem',
                borderLeft: '3px solid var(--accent-rose)',
              }}
            >
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
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
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

            {/* Terms Checkbox */}
            <div className="auth-terms-check">
              <label className="auth-checkbox-label" htmlFor="auth-terms-checkbox">
                <input
                  type="checkbox"
                  id="auth-terms-checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                />
                <span className="auth-checkmark"></span>
                <span className="auth-terms-text">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => navigate('/terms', { state: { fromAuth: true } })}
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => navigate('/privacy', { state: { fromAuth: true } })}
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className={`btn btn-primary auth-submit-btn ${!termsAccepted ? 'btn-disabled' : ''}`}
              disabled={loading || !termsAccepted}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: 'var(--space-md)',
                padding: '12px',
              }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-switch-simple">
            {isLogin ? (
              <p>
                New here?{' '}
                <button type="button" onClick={switchMode} className="btn-link">
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={switchMode} className="btn-link">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
