import React from 'react';

// PUBLIC_INTERFACE
export function JobList(): JSX.Element {
  /** Placeholder job list with dummy items. */
  const jobs = [
    { id: 'job-100', type: 'SNMP GET', status: 'completed' },
    { id: 'job-101', type: 'TR-181 GET', status: 'running' }
  ];

  return (
    <ul>
      {jobs.map(j => (
        <li key={j.id}>
          <span className="badge">{j.status}</span> {j.type} <small>({j.id})</small>
        </li>
      ))}
    </ul>
  );
}
