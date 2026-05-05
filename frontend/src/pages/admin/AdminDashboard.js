/**
 * Admin Dashboard — Analytics overview
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiBarChart2, FiBookOpen, FiDownload, FiEdit3, FiUsers } from 'react-icons/fi';

const card = { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' };
const ttStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' };

export default function AdminDashboard() {
  const { API } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/analytics')
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [API]);

  const handleExport = async () => {
    try {
      const res = await API.get('/admin/export/students', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mentriqiq-students-${Date.now()}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <p style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading analytics...</p>
    </div>
  );

  const { stats = {}, recentResults = [], testsByCategory = [], dailyAttempts = [] } = data || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Platform analytics and management</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Students', value: stats.totalStudents ?? 0, color: '#6366f1', icon: <FiUsers /> },
            { label: 'Total Tests', value: stats.totalTests ?? 0, color: '#8b5cf6', icon: <FiBookOpen /> },
            { label: 'Total Attempts', value: stats.totalAttempts ?? 0, color: '#10b981', icon: <FiEdit3 /> },
            { label: 'Avg. Score', value: `${stats.avgPercentage ?? 0}%`, color: '#f59e0b', icon: <FiBarChart2 /> },
            { label: 'Suspicious Attempts', value: stats.suspiciousAttempts ?? 0, color: '#ef4444', icon: <FiAlertTriangle /> },
          ].map(s => (
            <div key={s.label} style={{ ...card, borderTop: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{s.label}</p>
                  <p style={{ fontSize: '32px', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</p>
                </div>
                <span style={{ fontSize: '26px', display: 'inline-flex' }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          <div style={card}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '18px' }}>Daily Attempts (7 days)</h3>
            {dailyAttempts.length === 0
              ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0', fontSize: '14px' }}>No data yet</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyAttempts}>
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip contentStyle={ttStyle} />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
            }
          </div>
          <div style={card}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '18px' }}>Tests by Category</h3>
            {testsByCategory.length === 0
              ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0', fontSize: '14px' }}>No tests yet</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={testsByCategory}>
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { to: '/admin/tests/new', icon: <FiEdit3 />, label: 'Create New Test', desc: 'Add MCQ test with timer' },
            { to: '/admin/students', icon: <FiUsers />, label: 'View Students', desc: 'Browse all registrations' },
            { to: '/admin/proctoring', icon: <FiAlertTriangle />, label: 'Cheating Report', desc: 'Track suspicious attempts' },
          ].map(a => (
            <Link key={a.to} to={a.to} style={{ ...card, textDecoration: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.2s' }}>
              <span style={{ fontSize: '28px', display: 'inline-flex' }}>{a.icon}</span>
              <div>
                <p style={{ fontWeight: '700', fontSize: '14px' }}>{a.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.desc}</p>
              </div>
            </Link>
          ))}
          <div onClick={handleExport} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '28px', display: 'inline-flex' }}><FiDownload /></span>
            <div>
              <p style={{ fontWeight: '700', fontSize: '14px' }}>Export CSV</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Download student data</p>
            </div>
          </div>
        </div>

        {/* Recent results table */}
        <div style={card}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '18px' }}>Recent Submissions</h3>
          {recentResults.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', fontSize: '14px' }}>No submissions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{r.student?.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '8px' }}>— {r.test?.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: r.percentage >= 50 ? '#10b981' : '#ef4444' }}>{r.percentage}%</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.submittedAt).toLocaleDateString()}</span>
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
