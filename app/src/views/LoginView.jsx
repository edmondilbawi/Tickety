import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/useAuth.js';

function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      const user = await login(form);
      const destination = {
        customer: '/events',
        organizer: '/organizer',
        owner: '/owner/approvals',
      }[user.role] || '/';
      navigate(destination);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-layout">
      <aside className="auth-visual auth-visual-login">
        <div>
          <p className="eyebrow">Tickety moments</p>
          <h2>Your next experience is waiting.</h2>
          <p>Discover it, book it, and keep every reservation in one place.</p>
        </div>
        <div className="auth-ticket" aria-hidden="true">
          <small>ADMIT ONE</small>
          <strong>GOOD TIMES</strong>
          <span>••••••••••••</span>
        </div>
      </aside>

      <div className="auth-form-panel">
        <p className="eyebrow">Nice to see you again</p>
        <h1>Welcome back</h1>
        <p className="auth-intro">Log in to continue with Tickety.</p>

        {location.state?.message && (
          <p className="notice notice-success">{location.state.message}</p>
        )}
        {error && <p className="notice notice-error" role="alert">{error}</p>}

        <form className="form-card auth-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </div>

          <button className="button button-block" type="submit" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-switch">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </section>
  );
}

export default LoginView;
