import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export function DeviceTable(): JSX.Element {
  /** Placeholder device table with sample data. */
  const sample = [
    { id: 'dev-001', name: 'Router-01', ip: '192.168.1.1', status: 'online' },
    { id: 'dev-002', name: 'Switch-01', ip: '192.168.1.2', status: 'offline' }
  ];
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Device</th>
          <th>IP</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {sample.map(d => (
          <tr key={d.id}>
            <td><Link to={`/devices/${d.id}`}>{d.name}</Link></td>
            <td>{d.ip}</td>
            <td><span className="badge">{d.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
