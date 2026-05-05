/**
 * Admin Tests Page — List, publish/unpublish, delete tests
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';

const card = { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' };

export default function AdminTests() {
  const { API } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = () => {
    API.get('/admin/tests')
      .then(({ data }) => setTests(data.tests || []))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTests(); }, [API]);

  const handleTogglePublish = async (test) => {
    try {
      const { data } = await API.patch(`/admin/tests/${test._id}/publish`);
      setTests(prev => prev.map(t => t._id === test._id ? { ...t, isPublished: data.isPublished } : t));
      toast.success(data.message);
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test? All related results will also be deleted.')) return;
    try {
      await API.delete(`/admin/tests/${id}`);
      setTests(prev => prev.filter(t => t._id !== id));
      toast.success('Test deleted.');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Manage Tests</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{tests.length} total tests</p>
          </div>
          <Link to="/admin/tests/new" style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: '700', fontSize: '15px', textDecoration: 'none' }}>
            + Create Test
          </Link>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading tests...</p>
        ) : tests.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '80px' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>📝</p>
            <p style={{ fontWeight: '700', fontSize: '18px' }}>No tests yet</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Create your first test to get started.</p>
            <Link to="/admin/tests/new" style={{ padding: '12px 28px', borderRadius: '10px', background: '#6366f1', color: 'white', fontWeight: '700', textDecoration: 'none' }}>Create Test</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tests.map(test => (
              <div key={test._id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    {/* Title + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: '700' }}>{test.title}</h3>
                      <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{test.category || 'General'}</span>
                      <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: test.isPublished ? '#d1fae5' : '#f3f4f6', color: test.isPublished ? '#10b981' : '#6b7280' }}>
                        {test.isPublished ? '● Live' : '○ Draft'}
                      </span>
                      {test.isScheduled && <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#fef3c7', color: '#d97706' }}>🗓 Scheduled</span>}
                    </div>
                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>⏱ {test.duration} min</span>
                      <span>📝 {test.questions?.length || 0} questions</span>
                      <span>🏆 {test.totalMarks} marks</span>
                      <span>👥 {test.attemptCount || 0} attempts</span>
                      {test.attemptCount > 0 && <span>📊 Avg: {test.avgScore}%</span>}
                    </div>
                    {test.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>{test.description}</p>}
                    {test.isScheduled && test.scheduledStart && (
                      <p style={{ fontSize: '12px', color: '#d97706', marginTop: '6px' }}>
                        Available: {new Date(test.scheduledStart).toLocaleString()} — {test.scheduledEnd ? new Date(test.scheduledEnd).toLocaleString() : 'No end'}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleTogglePublish(test)} style={{
                      padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      background: test.isPublished ? '#fee2e2' : '#d1fae5',
                      color: test.isPublished ? '#ef4444' : '#10b981', border: 'none',
                    }}>
                      {test.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link to={`/admin/tests/edit/${test._id}`} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: 'rgba(99,102,241,0.1)', color: '#6366f1', textDecoration: 'none' }}>
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(test._id)} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
