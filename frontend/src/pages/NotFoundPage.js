import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', textAlign: 'center', padding: '24px' }}>
      <div>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🔍</div>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>404 — Page Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>The page you're looking for doesn't exist.</p>
        <Link to="/" style={{ padding: '12px 28px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: '700', textDecoration: 'none' }}>Go Home</Link>
      </div>
    </div>
  );
}
