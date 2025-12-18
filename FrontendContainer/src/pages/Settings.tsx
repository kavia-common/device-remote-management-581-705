import React from 'react';
import { ProtocolSelectors } from '../components/ProtocolSelectors';

// PUBLIC_INTERFACE
export default function Settings(): JSX.Element {
  /** Placeholder settings page */
  return (
    <div className="panel">
      <h2>Settings</h2>
      <ProtocolSelectors />
      <div style={{ marginTop: 12 }}>
        <p>API Base URL: <code>{import.meta.env.VITE_API_BASE_URL}</code></p>
      </div>
    </div>
  );
}
