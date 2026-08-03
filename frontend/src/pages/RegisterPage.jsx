import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const change = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  async function submit(event) {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await register(form); navigate('/', { replace: true }); }
    catch (requestError) { setError(errorMessage(requestError, 'Registration failed')); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="auth-page">
      <section className="auth-intro"><div className="brand light"><span className="brand-mark">N</span><span>NORM</span></div><h1>A calmer way to face the review queue.</h1><p>Your first workspace is created automatically. Add a repository whenever you are ready.</p></section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <p className="eyebrow">Start with NORM</p><h2>Create your account</h2><p>You will become the owner of a new team workspace.</p>
          <ErrorMessage message={error} />
          <label>Name<input autoComplete="name" minLength="2" required value={form.name} onChange={change('name')} /></label>
          <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={change('email')} /></label>
          <label>Password<input type="password" autoComplete="new-password" minLength="10" required value={form.password} onChange={change('password')} /><small>At least 10 characters</small></label>
          <button className="button button-primary full-width" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
          <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </section>
    </div>
  );
}

