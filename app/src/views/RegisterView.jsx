import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService.js';

function RegisterView() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
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
      await register(form);
      navigate('/login', {
        state: { message: 'Registration successful. You can now log in.' },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-layout">
      <aside className="auth-visual auth-visual-register">
        <div>
          <p className="eyebrow">Join the fun</p>
          <h2>Great events deserve great company.</h2>
          <p>Create a customer account to discover and book events.</p>
        </div>
        <div className="role-preview">
          <span><strong>Customer</strong>Discover and book events</span>
        </div>
      </aside>

      <div className="auth-form-panel">
        <p className="eyebrow">Start exploring</p>
        <h1>Create your Tickety account</h1>
        <p className="auth-intro">One account, plenty to look forward to.</p>

        {error && <p className="notice notice-error" role="alert">{error}</p>}

        <form className="form-card auth-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">First name</label>
          <br />
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
        </div>

        <div>
          <label htmlFor="lastName">Last name</label>
          <br />
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
        </div>

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
            minLength="12"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <small className="field-hint">12+ characters with uppercase, lowercase, number and symbol.</small>
        </div>

          <button className="button button-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterView;
