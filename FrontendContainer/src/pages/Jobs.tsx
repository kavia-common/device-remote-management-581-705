import React, { useState } from 'react';
import { JobList } from '../components/JobList';
import { api } from '../services/api';

// PUBLIC_INTERFACE
export default function Jobs(): JSX.Element {
  /** Jobs page with job enqueueing and monitoring. */
  const [protocol, setProtocol] = useState<'snmp' | 'webpa' | 'tr069' | 'usp'>('snmp');
  const [operation, setOperation] = useState<'get' | 'set' | 'bulkwalk'>('get');
  const [deviceId, setDeviceId] = useState('');
  const [params, setParams] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const enqueueJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedParams = JSON.parse(params);
      const endpoint = `/jobs/enqueue/${protocol}/${operation}`;
      
      await api().post(endpoint, {
        device_id: deviceId,
        params: parsedParams
      });

      // Refresh job list
      setRefreshKey(prev => prev + 1);
      
      // Reset form
      setParams('{}');
    } catch (err: any) {
      console.error('Failed to enqueue job:', err);
      setError(err?.response?.data?.detail || 'Failed to enqueue job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Jobs</h2>
      
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Enqueue New Job</h3>
        <form onSubmit={enqueueJob} className="column" style={{ gap: '12px' }}>
          <div className="row" style={{ gap: '8px' }}>
            <select value={protocol} onChange={e => setProtocol(e.target.value as any)}>
              <option value="snmp">SNMP</option>
              <option value="webpa">WebPA</option>
              <option value="tr069">TR-069</option>
              <option value="usp">USP</option>
            </select>
            
            <select value={operation} onChange={e => setOperation(e.target.value as any)}>
              <option value="get">GET</option>
              <option value="set">SET</option>
              {protocol === 'snmp' && <option value="bulkwalk">BULKWALK</option>}
            </select>

            <input 
              placeholder="Device ID" 
              value={deviceId}
              onChange={e => setDeviceId(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <textarea 
            placeholder='Params JSON (e.g., {"oid": "1.3.6.1.2.1.1.1.0"})'
            value={params}
            onChange={e => setParams(e.target.value)}
            rows={3}
            style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
            disabled={loading}
          />

          {error && (
            <div style={{ color: '#c33', fontSize: '0.9em' }}>
              {error}
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Enqueueing...' : 'Enqueue Job'}
            </button>
          </div>
        </form>
      </div>

      <JobList key={refreshKey} />
    </div>
  );
}
