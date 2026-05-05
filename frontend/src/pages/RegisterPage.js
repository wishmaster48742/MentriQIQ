/**
 * Register Page — Student registration
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' },
  card: { background: 'var(--surface)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', animation: 'fadeIn 0.4s ease' },
  logo: { fontSize: '28px', fontWeight: '800', textAlign: 'center', marginBottom: '6px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px', fontSize: '15px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '15px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '16px', display: 'block' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', cursor: 'pointer', border: 'none', marginTop: '8px' },
  footer: { textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' },
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', contactNumber: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match!');
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, contactNumber: form.contactNumber, password: form.password });
      toast.success('Account created! Welcome to MentriQIQ 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>MentriQIQ</h1>
        <p style={s.subtitle}>Create your student account</p>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Full Name</label>
          <input style={s.input} placeholder="John Doe" value={form.name} onChange={set('name')} required />
          <label style={s.label}>Email Address</label>
          <input style={s.input} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          <label style={s.label}>Contact Number</label>
          <input style={s.input} type="tel" placeholder="10-digit phone number" value={form.contactNumber} onChange={set('contactNumber')} required pattern="[0-9]{10,15}" />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
          <label style={s.label}>Confirm Password</label>
          <input style={s.input} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p style={s.footer}>
          Already registered? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
