import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import Layout from './components/Layout/Layout';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Main Pages
import Dashboard from './pages/Dashboard/Dashboard';
import DeviceList from './pages/Devices/DeviceList';
import DeviceDetail from './pages/Devices/DeviceDetail';
import DeviceCreate from './pages/Devices/DeviceCreate';
import DeviceEdit from './pages/Devices/DeviceEdit';
import QueryBuilder from './pages/Queries/QueryBuilder';
import QueryHistory from './pages/Queries/QueryHistory';
import AuditLogs from './pages/AuditLogs/AuditLogs';
import Health from './pages/Health/Health';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// PUBLIC_INTERFACE
function App() {
  /**
   * Main application component with routing configuration
   */
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/health" element={<Health />} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Device Routes */}
        <Route path="devices" element={<DeviceList />} />
        <Route path="devices/new" element={<DeviceCreate />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="devices/:id/edit" element={<DeviceEdit />} />
        
        {/* Query Routes */}
        <Route path="queries" element={<QueryBuilder />} />
        <Route path="queries/history" element={<QueryHistory />} />
        
        {/* Audit Logs */}
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>
      
      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
