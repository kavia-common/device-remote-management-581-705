import React, { useState } from 'react';
import { api } from '../services/api';

interface DeviceFormProps {
  onDeviceAdded?: () => void;
}

// PUBLIC_INTERFACE
export function DeviceForm({ onDeviceAdded }: DeviceFormProps = {}): JSX.Element {
  /** Device creation form that posts to backend /devices endpoint. */
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api().post('/devices', {
        name,
        ip,
        metadata: {}
      });

      // Clear form on success
      setName('');
      setIp('');
      setSuccess(true);

      // Notify parent to refresh list
      if (onDeviceAdded) {
        onDeviceAdded();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to add device:', err);
      setError(err?.response?.data?.detail || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <form onSubmit={submit} className="row" style={{ gap: 8 }}>
        <input 
          placeholder="Device name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
          disabled={loading}
        />
        <input 
          placeholder="IP address" 
          value={ip} 
          onChange={e => setIp(e.target.value)} 
          required 
          disabled={loading}
        />
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Device'}
        </button>
      </form>
      {error && (
        <div style={{ marginTop: '8px', color: '#c33', fontSize: '0.9em' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: '8px', color: '#2a7' fontSize: '0.9em' }}>
          Device added successfully!
        </div>
      )}
    </div>
  );
}
