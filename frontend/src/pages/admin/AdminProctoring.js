import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiFilter, FiShield, FiUser, FiUsers } from 'react-icons/fi';

const card = { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' };

export default function AdminProctoring() {
  const { API } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ attempts: [], riskLeaderboard: [], summary: {} });
  const [onlySuspicious, setOnlySuspicious] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    API.get('/admin/proctoring-report')
      .then(({ data: payload }) => setData(payload))
      .catch(() => toast.error('Failed to load proctoring report'))
      .finally(() => setLoading(false));
  }, [API]);

  const categories = useMemo(() => {
    const set = new Set((data.attempts || []).map((a) => a.category || 'General'));
    return ['all', ...Array.from(set)];
  }, [data.attempts]);

  const filteredAttempts = useMemo(() => {
    return (data.attempts || []).filter((a) => {
      if (onlySuspicious && !a.suspicious) return false;
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
      const text = `${a.studentName} ${a.studentEmail} ${a.testTitle}`.toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data.attempts, onlySuspicious, selectedCategory, search]);

  const violationCount = (counts = {}) => Object.values(counts).reduce((sum, val) => sum + Number(val || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiShield color="#6366f1" /> Proctoring Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Smart cheating insights, suspicious attempts, and risk leaderboard.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '18px' }}>
          <div style={{ ...card, padding: '16px 20px' }}>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Total Attempts</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#6366f1' }}>{data.summary?.totalAttempts ?? 0}</p>
          </div>
          <div style={{ ...card, padding: '16px 20px' }}>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Suspicious Attempts</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444' }}>{data.summary?.suspiciousAttempts ?? 0}</p>
          </div>
          <div style={{ ...card, padding: '16px 20px' }}>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Average Integrity</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{data.summary?.avgIntegrity ?? 100}%</p>
          </div>
        </div>

        <div style={{ ...card, marginBottom: '18px', padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>
            <FiFilter /> Filters
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student/test..."
            style={{ flex: 1, minWidth: '230px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlySuspicious} onChange={(e) => setOnlySuspicious(e.target.checked)} />
            Only suspicious
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: '16px' }}>
          <div style={card}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUsers /> Risk Leaderboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(data.riskLeaderboard || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No data available.</p>
              ) : (data.riskLeaderboard || []).map((r, idx) => (
                <div key={`${r.studentEmail}-${idx}`} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}><FiUser size={13} /> {r.studentName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.studentEmail}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Risk</p>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444' }}>{r.riskScore}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiAlertTriangle /> Attempt Violation Log
            </h3>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading proctoring data...</p>
            ) : filteredAttempts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No attempts match current filters.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '65vh', overflow: 'auto', paddingRight: '4px' }}>
                {filteredAttempts.map((a) => (
                  <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '14px' }}>{a.studentName} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({a.testTitle})</span></p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(a.submittedAt).toLocaleString()} · {a.category}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Integrity</p>
                        <p style={{ fontWeight: '800', color: a.integrityScore < 70 ? '#ef4444' : '#10b981' }}>{a.integrityScore}%</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '99px', background: a.suspicious ? '#fee2e2' : 'rgba(16,185,129,0.15)', color: a.suspicious ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                        {a.suspicious ? 'Suspected' : 'Clean'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Violations: <strong style={{ color: 'var(--text)' }}>{violationCount(a.eventCounts)}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>Score: <strong style={{ color: 'var(--text)' }}>{a.percentage}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
