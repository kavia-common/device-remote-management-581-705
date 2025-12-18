import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface Device {
  id: string;
  name: string;
  ip: string;
  metadata?: Record<string, any>;
}

// PUBLIC_INTERFACE
export function DeviceTable(): JSX.Element {
  /** Device table that fetches and displays devices from backend API. */
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api().get('/devices');
      setDevices(response.data.items || response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch devices:', err);
      setError(err?.response?.data?.detail || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) {
      return;
    }

    try {
      await api().delete(`/devices/${deviceId}`);
      // Optimistic update
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err: any) {
      console.error('Failed to delete device:', err);
      alert(err?.response?.data?.detail || 'Failed to delete device');
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading devices...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#c33' }}>
        {error}
        <button onClick={fetchDevices} style={{ marginLeft: '12px' }}>Retry</button>
      </div>
    );
  }

  if (devices.length === 0) {
    return <div style={{ padding: '20px', color: '#666' }}>No devices found. Add one above.</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Device</th>
          <th>IP</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {devices.map(d => (
          <tr key={d.id}>
            <td><Link to={`/devices/${d.id}`}>{d.name}</Link></td>
            <td>{d.ip}</td>
            <td><span className="badge">{d.metadata?.status || 'unknown'}</span></td>
            <td>
              <button 
                className="ghost" 
                onClick={() => handleDelete(d.id)}
                style={{ fontSize: '0.85em', padding: '4px 8px' }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
