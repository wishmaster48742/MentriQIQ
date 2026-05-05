/**
 * Test List Page — Shows all available tests for students
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';

const card = { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow)' };

export default function TestListPage() {
  const { API } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    API.get('/tests').then(({ data }) => setTests(data.tests || []))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  }, [API]);

  const filtered = tests.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px' }}>Available Tests</h1>
          <input
            placeholder="🔍 Search tests by title or category..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '15px' }}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Loading tests...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <p style={{ fontWeight: '600' }}>No tests found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.4s ease' }}>
            {filtered.map(test => (
              <div key={test._id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{test.title}</h3>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '12px', fontWeight: '600' }}>
                      {test.category || 'General'}
                    </span>
                    {test.attempted && (
                      <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#d1fae5', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                        ✓ Attempted
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>{test.description || 'Test your knowledge and skills.'}</p>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>⏱ {test.duration} minutes</span>
                    <span>📝 {test.questions?.length || 0} questions</span>
                    <span>🏆 {test.totalMarks} marks</span>
                    {test.attempted && <span style={{ color: '#10b981', fontWeight: '600' }}>Your score: {test.myPercentage}%</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
                  {test.attempted ? (
                    <>
                      <Link to={`/leaderboard/${test._id}`} style={{ padding: '10px 20px', borderRadius: '8px', border: '1.5px solid var(--primary)', color: 'var(--primary)', fontWeight: '600', textAlign: 'center', textDecoration: 'none', fontSize: '14px' }}>
                        Leaderboard
                      </Link>
                      {test.allowRetake && (
                        <Link to={`/tests/${test._id}`} style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: '600', textAlign: 'center', textDecoration: 'none', fontSize: '14px' }}>
                          Retake
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link to={`/tests/${test._id}`} style={{ padding: '12px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: '700', textAlign: 'center', textDecoration: 'none', fontSize: '15px' }}>
                      Start Test →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
