import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <div className="brand light">
          <span className="brand-mark">N</span>
          <span>NORM</span>
        </div>
        <h1>Put every pull request in the right hands.</h1>
        <p>Transparent triage for teams reviewing agent-generated code at scale.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <p className="eyebrow">Welcome back</p>
          <h2>Log in to your queue</h2>
          <p>Review what is ready, return what is not, and understand every ranking.</p>
          <ErrorMessage message={error} />
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button className="button button-primary full-width" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
          <p className="auth-switch">
            New to NORM? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
