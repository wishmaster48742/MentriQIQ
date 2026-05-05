/**
 * Result Page — Shows score after test submission
 * IMPORTANT: Only shows total score, NOT which answers were correct
 */

import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state?.result) {
    navigate('/dashboard');
    return null;
  }

  const { result, testTitle } = state;
  const { score, totalMarks, percentage, isPassed, timeTaken } = result;
  const mins = Math.floor((timeTaken || 0) / 60);
  const secs = (timeTaken || 0) % 60;

  const getGrade = (p) => {
    if (p >= 90) return { grade: 'A+', color: '#10b981', message: 'Outstanding performance! 🏆' };
    if (p >= 80) return { grade: 'A', color: '#10b981', message: 'Excellent work! 🌟' };
    if (p >= 70) return { grade: 'B', color: '#6366f1', message: 'Good job! Keep it up! 👍' };
    if (p >= 60) return { grade: 'C', color: '#f59e0b', message: 'Fair performance. Practice more! 📚' };
    if (p >= 50) return { grade: 'D', color: '#f59e0b', message: 'You passed, but there\'s room to improve.' };
    return { grade: 'F', color: '#ef4444', message: 'Keep practicing and try again! 💪' };
  };

  const { grade, color, message } = getGrade(percentage);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px', padding: '48px 40px', maxWidth: '520px', width: '100%', textAlign: 'center', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Score Ring */}
        <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: `8px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative', background: `${color}15` }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '900', color, lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{percentage}%</div>
          </div>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Test Completed!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{testTitle}</p>
        <p style={{ fontSize: '15px', fontWeight: '600', color, marginBottom: '32px' }}>{message}</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Score', value: `${score}/${totalMarks}`, color: '#6366f1' },
            { label: 'Status', value: isPassed ? 'Passed ✓' : 'Failed ✗', color: isPassed ? '#10b981' : '#ef4444' },
            { label: 'Time', value: `${mins}m ${secs}s`, color: '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Note: No answer breakdown shown to students */}
        <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '28px', fontSize: '13px', color: 'var(--text-muted)', border: '1px solid rgba(99,102,241,0.15)' }}>
          ℹ️ Detailed answer breakdown is not available. Focus on improving your overall score!
        </div>

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <Link to="/tests" style={{ padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: '700', textDecoration: 'none', fontSize: '15px' }}>
            Browse More Tests
          </Link>
          <Link to="/dashboard" style={{ padding: '14px', borderRadius: '10px', border: '1.5px solid var(--border)', color: 'var(--text)', fontWeight: '600', textDecoration: 'none', fontSize: '15px' }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
