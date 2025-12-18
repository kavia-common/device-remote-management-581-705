import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

// PUBLIC_INTERFACE
export default function Settings(): JSX.Element {
  /** Settings page with theme toggle and system information. */
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
        <p className="text-muted">Manage your preferences and view system information</p>
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">Appearance</h2>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-text">Theme</p>
            <p className="text-sm text-muted">
              Current theme: <Badge variant="default">{theme === 'dark' ? 'Dark' : 'Light'}</Badge>
            </p>
          </div>
          <Button variant="secondary" onClick={toggleTheme}>
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
        </div>
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">Account</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-text">Email</p>
              <p className="text-sm text-muted">{user?.email || 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-text">Username</p>
              <p className="text-sm text-muted">{user?.username || 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-text">Tenant ID</p>
              <p className="text-sm text-muted font-mono">{user?.tenant_id || 'Not available'}</p>
            </div>
          </div>
          <div className="pt-2">
            <Button variant="danger" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">System Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">API Base URL</span>
            <code className="text-xs bg-bg px-2 py-1 rounded text-accent">
              {import.meta.env.VITE_API_BASE_URL || 'Not configured'}
            </code>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Environment</span>
            <Badge variant="info">
              {import.meta.env.MODE || 'development'}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted">Version</span>
            <span className="text-sm text-text">1.0.0</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">Supported Protocols</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-bg rounded-lg">
            <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
              <Badge variant="success">SNMP</Badge>
            </h3>
            <p className="text-sm text-muted">Simple Network Management Protocol v2c and v3</p>
          </div>
          <div className="p-4 bg-bg rounded-lg">
            <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
              <Badge variant="success">WebPA</Badge>
            </h3>
            <p className="text-sm text-muted">Web Protocol for Aggregation</p>
          </div>
          <div className="p-4 bg-bg rounded-lg">
            <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
              <Badge variant="success">TR-069</Badge>
            </h3>
            <p className="text-sm text-muted">CPE WAN Management Protocol (CWMP)</p>
          </div>
          <div className="p-4 bg-bg rounded-lg">
            <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
              <Badge variant="success">USP</Badge>
            </h3>
            <p className="text-sm text-muted">User Services Platform (TR-369)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
