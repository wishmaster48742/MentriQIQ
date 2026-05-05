/**
 * AdminStudents — View all students, their results, and export data
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiDownload, FiSearch, FiShield, FiUserCheck, FiUsers } from 'react-icons/fi';

const card = { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' };

export default function AdminStudents() {
  const { API } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    API.get('/admin/students')
      .then(({ data }) => setStudents(data.students || []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [API]);

  const handleExport = async () => {
    try {
      const res = await API.get('/admin/export/students', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `students-${Date.now()}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.contactNumber.includes(search)
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Student Management</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{students.length} registered students</p>
          </div>
          <button onClick={handleExport} style={{ padding: '11px 22px', borderRadius: '10px', background: '#10b981', color: 'white', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><FiDownload /> Export CSV</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            placeholder="Search by name, email or phone..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '15px' }}
          />
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Students', value: students.length, color: '#6366f1', icon: <FiUsers /> },
            { label: 'With Attempts', value: students.filter(s => s.totalAttempts > 0).length, color: '#10b981', icon: <FiUserCheck /> },
            { label: 'Flagged Attempts', value: students.reduce((sum, s) => sum + (s.results || []).filter(r => r.proctoring?.suspicious).length, 0), color: '#ef4444', icon: <FiAlertTriangle /> },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '16px 20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>{s.icon} {s.label}</p>
              <p style={{ fontSize: '26px', fontWeight: '800', color: s.color, lineHeight: 1.2 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Student list */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading students...</p>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '80px' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>👥</p>
            <p style={{ fontWeight: '700' }}>{search ? 'No matching students' : 'No students yet'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(student => (
              <div key={student._id} style={card}>
                {/* Student header row */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setExpanded(expanded === student._id ? null : student._id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Avatar */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                      {student.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '15px' }}>{student.name}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{student.email} · {student.contactNumber}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tests Attempted</p>
                      <p style={{ fontWeight: '700', color: '#6366f1' }}>{student.totalAttempts || 0}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Joined</p>
                      <p style={{ fontWeight: '600', fontSize: '13px' }}>{new Date(student.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{expanded === student._id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded: result list */}
                {expanded === student._id && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    {student.results?.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No tests attempted yet.</p>
                    ) : (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Test Results</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {student.results.map((r, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{r.testTitle}</span>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: r.proctoring?.suspicious ? '#ef4444' : '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <FiShield size={12} /> Integrity {r.proctoring?.integrityScore ?? 100}%
                                  </span>
                                  {(r.proctoring?.suspicious) && (
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <FiAlertTriangle size={12} /> Suspected
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <span style={{ fontWeight: '700', color: r.percentage >= 50 ? '#10b981' : '#ef4444' }}>
                                  {r.score}/{r.totalMarks} ({r.percentage}%)
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Violations {(Object.values(r.proctoring?.eventCounts || {}).reduce((a, b) => a + b, 0))}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {new Date(r.submittedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
