/**
 * Navbar — Sticky top nav for all authenticated pages
 */
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout, darkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';
  const active = (path) => pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const navLink = (to, label) => (
    <Link to={to} style={{
      padding: '7px 13px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
      color: active(to) ? '#6366f1' : 'var(--text-muted)',
      background: active(to) ? 'rgba(99,102,241,0.1)' : 'transparent',
      textDecoration: 'none', transition: 'all 0.2s',
    }}>{label}</Link>
  );

  return (
    <nav style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <Link to={isAdmin ? '/admin' : '/dashboard'} style={{
        fontSize: '22px', fontWeight: '800', textDecoration: 'none',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>MentriQIQ</Link>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {isAdmin ? (
          <>
            {navLink('/admin', 'Dashboard')}
            {navLink('/admin/tests', 'Tests')}
            {navLink('/admin/students', 'Students')}
            {navLink('/admin/proctoring', 'Proctoring')}
          </>
        ) : (
          <>
            {navLink('/dashboard', 'Dashboard')}
            {navLink('/tests', 'Tests')}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={toggleDarkMode} title="Toggle theme" style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '7px 11px', cursor: 'pointer', fontSize: '15px',
        }}>{darkMode ? '☀️' : '🌙'}</button>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: '700', fontSize: '12px',
        }}>{initials}</div>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</span>
        <button onClick={handleLogout} style={{
          padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
          background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer',
        }}>Logout</button>
      </div>
    </nav>
  );
}
