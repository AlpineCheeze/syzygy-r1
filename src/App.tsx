/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Orbit } from 'lucide-react';
import { User } from './types';
import Login from './pages/Login';
import Home from './pages/Home';
import ProjectDashboard from './pages/ProjectDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SubcontractorDashboard from './pages/SubcontractorDashboard';
import Inspections from './pages/Inspections';
import Milestones from './pages/Milestones';
import Photos from './pages/Photos';
import Drawings from './pages/Drawings';
import Directory from './pages/Directory';
import RFIs from './pages/RFIs';
import Warranty from './pages/Warranty';
import Schedule from './pages/Schedule';
import Procurement from './pages/Procurement';
import Incidents from './pages/Incidents';
import { hasPermission } from './lib/permissions';

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in their child component tree, logs those errors, 
 * and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null as Error | null };
  props!: {children: React.ReactNode};

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <pre className="bg-red-50 p-4 rounded">{this.state.error?.toString()}</pre>
          <pre className="bg-red-50 p-4 rounded mt-4">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Main Application Component
 * 
 * Handles global state (like the authenticated user), routing, and the main layout shell.
 * It wraps the entire application in an ErrorBoundary and a BrowserRouter.
 */
export default function App() {
  // State to hold the currently authenticated user
  const [user, setUser] = useState<User | null>(null);

  // Check local storage on mount to see if a user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // If no user is logged in, render the Login page and pass the handleLogin callback
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Main application layout and routing
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-wunder-bg text-wunder-dark font-sans">
        <header className="bg-wunder-dark text-wunder-light shadow-sm border-b border-wunder-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group transition-all duration-300">
              <Orbit className="h-6 w-6 text-wunder-lime group-hover:text-wunder-yellow transition-colors" />
              <span className="text-2xl font-black tracking-[0.3em] text-wunder-lime group-hover:text-wunder-yellow transition-colors drop-shadow-[0_0_8px_rgba(226,249,156,0.4)] group-hover:drop-shadow-[0_0_12px_rgba(241,255,115,0.6)]">
                SYZYGY
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-wunder-border">{user.name} ({user.company_name})</span>
              <button onClick={handleLogout} className="text-sm text-wunder-lime hover:text-wunder-yellow font-medium">Logout</button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/projects/:projectId" element={<ProjectDashboard user={user} />} />
              <Route path="/projects/:projectId/submittals" element={
                hasPermission(user, 'submittals', 'VIEWER') ? (
                  user.role === 'ADMIN' ? <AdminDashboard user={user} /> : <SubcontractorDashboard user={user} />
                ) : <Navigate to={`/projects/${window.location.pathname.split('/')[2]}`} replace />
              } />
              <Route path="/projects/:projectId/inspections" element={
                hasPermission(user, 'inspections', 'VIEWER') ? <Inspections user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/milestones" element={
                hasPermission(user, 'milestones', 'VIEWER') ? <Milestones user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/photos" element={
                hasPermission(user, 'photos', 'VIEWER') ? <Photos user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/drawings" element={
                hasPermission(user, 'drawings', 'VIEWER') ? <Drawings user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/directory" element={
                hasPermission(user, 'directory', 'VIEWER') ? <Directory user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/rfis" element={
                hasPermission(user, 'rfis', 'VIEWER') ? <RFIs user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/warranty" element={
                hasPermission(user, 'warranty', 'VIEWER') ? <Warranty user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/schedule" element={
                hasPermission(user, 'schedule', 'VIEWER') ? <Schedule user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/procurement" element={
                hasPermission(user, 'procurement', 'VIEWER') ? <Procurement user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="/projects/:projectId/incidents" element={
                hasPermission(user, 'incidents', 'VIEWER') ? <Incidents user={user} /> : <Navigate to="/" replace />
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
