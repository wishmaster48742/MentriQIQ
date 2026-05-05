/**
 * Login Page — for both students and admins
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: '20px',
  },
  card: {
    background: 'var(--surface)', borderRadius: '20px', padding: '48px 40px',
    width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)', animation: 'fadeIn 0.4s ease',
  },
  logo: {
    fontSize: '32px', fontWeight: '800', textAlign: 'center', marginBottom: '8px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subtitle: { textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '15px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '15px',
    border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
    marginBottom: '20px', display: 'block',
  },
  btn: {
    width: '100%', padding: '14px', borderRadius: '10px', fontSize: '16px',
    fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    cursor: 'pointer', border: 'none', marginTop: '8px', transition: 'opacity 0.2s',
  },
  footer: { textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' },
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>MentriQIQ</h1>
        <p style={s.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email Address</label>
          <input
            style={s.input} type="email" placeholder="you@example.com"
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required autoFocus
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input} type="password" placeholder="Enter your password"
            value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
          />
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>Register here</Link>
        </p>
        
        <p style={{ ...s.footer, marginTop: '8px', fontSize: '12px', opacity: 0.6 }}>
          Admin? Use your admin credentials above.
        </p>
      </div>
    </div>
  );
}
