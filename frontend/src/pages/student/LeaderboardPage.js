/**
 * Leaderboard Page — Shows top performers for a specific test
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';

export default function LeaderboardPage() {
  const { testId } = useParams();
  const { API } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/results/leaderboard/${testId}`)
      .then(({ data }) => setLeaderboard(data.leaderboard || []))
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [testId, API]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.4s ease' }}>
        <Link to="/tests" style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>← Back to Tests</Link>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>🏆 Leaderboard</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Top 20 performers</p>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaderboard.map((entry, idx) => (
              <div key={idx} style={{ background: entry.isCurrentUser ? 'rgba(99,102,241,0.08)' : 'var(--surface)', borderRadius: '12px', padding: '16px 20px', border: entry.isCurrentUser ? '2px solid #6366f1' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ width: '36px', textAlign: 'center', fontSize: idx < 3 ? '24px' : '16px', fontWeight: '800', color: 'var(--text-muted)' }}>
                  {idx < 3 ? medals[idx] : `#${entry.rank}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>
                    {entry.name} {entry.isCurrentUser && <span style={{ fontSize: '12px', color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '10px' }}>You</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Time: {Math.floor(entry.timeTaken / 60)}m {entry.timeTaken % 60}s
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: entry.percentage >= 50 ? '#10b981' : '#ef4444' }}>
                    {entry.percentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Score: {entry.score}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
