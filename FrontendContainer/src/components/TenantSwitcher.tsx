import React from 'react';
import { useAuthStore } from '../store/auth';

// PUBLIC_INTERFACE
export function TenantSwitcher(): JSX.Element {
  /** Simple tenant switcher placeholder with logout. */
  const { user, logout } = useAuthStore();

  return (
    <div className="row" style={{ gap: 8 }}>
      <select defaultValue="default">
        <option value="default">Default Tenant</option>
        <option value="alpha">Alpha</option>
        <option value="beta">Beta</option>
      </select>
      {user ? (
        <>
          <span style={{ color: '#8ca0b3' }}>{user.username}</span>
          <button className="ghost" onClick={logout}>Logout</button>
        </>
      ) : (
        <span className="badge">Guest</span>
      )}
    </div>
  );
}
