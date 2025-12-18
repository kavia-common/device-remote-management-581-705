import React, { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Jobs from './pages/Jobs';
import MIBBrowser from './pages/MIBBrowser';
import TR181Browser from './pages/TR181Browser';
import Settings from './pages/Settings';
import Audit from './pages/Audit';
import { TenantSwitcher } from './components/TenantSwitcher';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/auth';
import './styles.css';

// PUBLIC_INTERFACE
export default function App(): JSX.Element {
  /** Main application component with routing and authentication. */
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user && !window.location.pathname.includes('/login')) {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="app">
      {user && (
        <header className="app__header">
          <Link to="/" className="brand">Device Remote Management</Link>
          <nav className="nav">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/devices">Devices</NavLink>
            <NavLink to="/jobs">Jobs</NavLink>
            <NavLink to="/mib-browser">MIB</NavLink>
            <NavLink to="/tr181-browser">TR-181</NavLink>
            <NavLink to="/audit">Audit</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
          <div className="header__right">
            <TenantSwitcher />
          </div>
        </header>
      )}
      
      <main className="app__main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
          <Route path="/devices/:id" element={<ProtectedRoute><DeviceDetail /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/mib-browser" element={<ProtectedRoute><MIBBrowser /></ProtectedRoute>} />
          <Route path="/tr181-browser" element={<ProtectedRoute><TR181Browser /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<div className="panel">Page not found</div>} />
        </Routes>
      </main>
      
      {user && (
        <footer className="app__footer">
          <small>© {new Date().getFullYear()} Device Remote Management Platform</small>
        </footer>
      )}
    </div>
  );
}
