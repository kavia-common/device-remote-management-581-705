import React from 'react';

// PUBLIC_INTERFACE
export default function Dashboard(): JSX.Element {
  /** Basic dashboard placeholder. */
  return (
    <div className="panel">
      <h2>Dashboard</h2>
      <p>Welcome to the Device Remote Management platform.</p>
      <ul>
        <li>Recent jobs summary</li>
        <li>Active devices</li>
        <li>Protocol health</li>
      </ul>
    </div>
  );
}
