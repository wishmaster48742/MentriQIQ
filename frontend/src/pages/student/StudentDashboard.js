/**
 * Student Dashboard
 * Shows stats, recent results, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const card = { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow)' };
const statCard = (color) => ({ ...card, borderTop: `4px solid ${color}` });

export default function StudentDashboard() {
  const { user, API } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/results/my').then(({ data }) => {
      setResults(data.results || []);
    }).finally(() => setLoading(false));
  }, [API]);

  const totalAttempted = results.length;
  const avgScore = totalAttempted ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / totalAttempted) : 0;
  const bestScore = totalAttempted ? Math.max(...results.map(r => r.percentage)) : 0;
  const passedCount = results.filter(r => r.isPassed).length;

  // Chart data: last 5 results
  const chartData = results.slice(0, 5).reverse().map(r => ({
    name: r.test?.title?.slice(0, 12) + '...' || 'Test',
    score: r.percentage
  }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* Welcome Header */}
        <div style={{ marginBottom: '32px', animation: 'fadeIn 0.4s ease' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Here's your performance summary</p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Tests Attempted', value: totalAttempted, color: '#6366f1' },
            { label: 'Average Score', value: `${avgScore}%`, color: '#10b981' },
            { label: 'Best Score', value: `${bestScore}%`, color: '#f59e0b' },
            { label: 'Tests Passed', value: passedCount, color: '#8b5cf6' },
          ].map(stat => (
            <div key={stat.label} style={statCard(stat.color)}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>{stat.label}</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {/* Performance Chart */}
          <div style={card}>
            <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '700' }}>Score History</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                    formatter={(v) => [`${v}%`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.score >= 50 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No test data yet. Take a test to see your chart!
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={card}>
            <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '700' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/tests" style={{ display: 'block', padding: '16px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: '700', textAlign: 'center', textDecoration: 'none', fontSize: '15px' }}>
                🚀 Browse Available Tests
              </Link>
              <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your Account</div>
                <div style={{ fontWeight: '600', marginTop: '4px' }}>{user?.email}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>📱 {user?.contactNumber}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Results */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Recent Test Results</h3>
            <Link to="/tests" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>View All Tests →</Link>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>Loading results...</p>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <p style={{ fontWeight: '600', marginBottom: '8px' }}>No tests attempted yet</p>
              <p style={{ fontSize: '14px' }}>Head over to the Tests section and start your first quiz!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.slice(0, 6).map(result => (
                <div key={result._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>{result.test?.title || 'Unknown Test'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {result.test?.category} · {new Date(result.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', fontSize: '18px', color: result.percentage >= 50 ? '#10b981' : '#ef4444' }}>
                        {result.percentage}%
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{result.score}/{result.totalMarks} marks</div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: result.isPassed ? '#d1fae5' : '#fee2e2', color: result.isPassed ? '#10b981' : '#ef4444' }}>
                      {result.isPassed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
