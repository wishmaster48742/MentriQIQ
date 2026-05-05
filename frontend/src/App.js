/**
 * App.js — Root with routing and auth guards
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

import StudentDashboard from './pages/student/StudentDashboard';
import TestListPage from './pages/student/TestListPage';
import TestPage from './pages/student/TestPage';
import ResultPage from './pages/student/ResultPage';
import LeaderboardPage from './pages/student/LeaderboardPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTests from './pages/admin/AdminTests';
import AdminStudents from './pages/admin/AdminStudents';
import TestEditor from './pages/admin/TestEditor';
import AdminProctoring from './pages/admin/AdminProctoring';

// ── Route Guards ─────────────────────────────────────────────────────────────
const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Student */}
      <Route path="/dashboard" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
      <Route path="/tests" element={<PrivateRoute><TestListPage /></PrivateRoute>} />
      <Route path="/tests/:id" element={<PrivateRoute><TestPage /></PrivateRoute>} />
      <Route path="/result/:id" element={<PrivateRoute><ResultPage /></PrivateRoute>} />
      <Route path="/leaderboard/:testId" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/tests" element={<PrivateRoute adminOnly><AdminTests /></PrivateRoute>} />
      <Route path="/admin/tests/new" element={<PrivateRoute adminOnly><TestEditor /></PrivateRoute>} />
      <Route path="/admin/tests/edit/:id" element={<PrivateRoute adminOnly><TestEditor /></PrivateRoute>} />
      <Route path="/admin/students" element={<PrivateRoute adminOnly><AdminStudents /></PrivateRoute>} />
      <Route path="/admin/proctoring" element={<PrivateRoute adminOnly><AdminProctoring /></PrivateRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '14px' }
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
