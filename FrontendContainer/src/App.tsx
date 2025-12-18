import React, { useEffect, useState } from 'react';
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
import { ThemeToggle } from './components/ThemeToggle';
import { Breadcrumbs } from './components/Breadcrumbs';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/auth';
import { cn } from './utils/cn';

// PUBLIC_INTERFACE
export default function App(): JSX.Element {
  /** Main application with responsive layout and navigation. */
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user && !window.location.pathname.includes('/login')) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/devices', label: 'Devices', icon: '🖥️' },
    { to: '/jobs', label: 'Jobs', icon: '⚙️' },
    { to: '/mib-browser', label: 'MIB Browser', icon: '📚' },
    { to: '/tr181-browser', label: 'TR-181 Browser', icon: '🌳' },
    { to: '/audit', label: 'Audit Logs', icon: '📋' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Top Navigation Bar */}
      <header className="bg-panel border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-bg rounded-lg transition-colors lg:hidden"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="text-lg font-bold text-text hover:text-accent transition-colors">
              Device Remote Management
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <TenantSwitcher />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-muted hover:text-text transition-colors px-3 py-1.5"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'bg-panel border-r border-border transition-all duration-300 flex-shrink-0',
            'lg:relative lg:translate-x-0',
            sidebarOpen ? 'w-64' : 'w-0 lg:w-16',
            'absolute inset-y-0 left-0 z-30 lg:z-auto'
          )}
        >
          <nav className="p-4 space-y-1" aria-label="Main navigation">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                    'hover:bg-bg focus:outline-none focus:ring-2 focus:ring-accent',
                    isActive ? 'bg-bg text-accent font-medium' : 'text-muted hover:text-text'
                  )
                }
              >
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Breadcrumbs />
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
              <Route path="*" element={
                <div className="panel text-center">
                  <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
                  <p className="text-muted mb-6">The page you're looking for doesn't exist.</p>
                  <Link to="/" className="text-accent hover:underline">Go to Dashboard</Link>
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
