import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { api } from '../services/api';

// PUBLIC_INTERFACE
export function TenantSwitcher(): JSX.Element {
  /** Tenant switcher that fetches available tenants and allows switching context. */
  const { user, logout } = useAuthStore();
  const { tenants, selectedTenantId, setTenants, selectTenant } = useTenantStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch available tenants when user is logged in
    if (user && tenants.length === 0) {
      fetchTenants();
    }
  }, [user]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await api().get('/tenants');
      setTenants(response.data.items || response.data || []);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tenantId = e.target.value;
    if (tenantId) {
      selectTenant(tenantId);
      // Refresh current page to apply new tenant context
      window.location.reload();
    }
  };

  if (!user) {
    return (
      <div className="row" style={{ gap: 8 }}>
        <span className="badge">Guest</span>
      </div>
    );
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      {tenants.length > 0 && (
        <select 
          value={selectedTenantId || user.tenant_id || ''} 
          onChange={handleTenantChange}
          disabled={loading}
        >
          <option value="">Select Tenant</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}
      <span style={{ color: '#8ca0b3' }}>{user.username}</span>
      <button className="ghost" onClick={logout}>Logout</button>
    </div>
  );
}
