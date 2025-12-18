import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface MIBModule {
  id: string;
  name: string;
  created_at: string;
}

interface MIBOID {
  id: string;
  oid: string;
  name: string;
  syntax?: string;
  access?: string;
  description?: string;
}

// PUBLIC_INTERFACE
export function MIBTree(): JSX.Element {
  /** MIB browser with module and OID listing from backend. */
  const [modules, setModules] = useState<MIBModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [oids, setOids] = useState<MIBOID[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      fetchOIDs(selectedModule);
    }
  }, [selectedModule, searchTerm]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await api().get('/mib/modules', {
        params: { limit: 100 }
      });
      setModules(response.data.items || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch MIB modules:', err);
      setError(err?.response?.data?.detail || 'Failed to load MIB modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchOIDs = async (moduleId: string) => {
    setLoading(true);
    try {
      const response = await api().get(`/mib/modules/${moduleId}/oids`, {
        params: { 
          search: searchTerm || undefined,
          limit: 100 
        }
      });
      setOids(response.data.items || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch OIDs:', err);
      setError(err?.response?.data?.detail || 'Failed to load OIDs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="row" style={{ gap: '12px', marginBottom: '16px' }}>
        <select 
          value={selectedModule || ''} 
          onChange={e => setSelectedModule(e.target.value)}
          disabled={loading || modules.length === 0}
        >
          <option value="">Select MIB Module</option>
          {modules.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {selectedModule && (
          <input 
            placeholder="Search OIDs..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', color: '#c33', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading && <div>Loading...</div>}

      {!selectedModule && !loading && modules.length === 0 && (
        <div style={{ color: '#666' }}>
          No MIB modules found. Upload MIB files via Settings page.
        </div>
      )}

      {selectedModule && oids.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>OID</th>
              <th>Name</th>
              <th>Syntax</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {oids.map(oid => (
              <tr key={oid.id} title={oid.description}>
                <td><code>{oid.oid}</code></td>
                <td>{oid.name}</td>
                <td>{oid.syntax || '-'}</td>
                <td>{oid.access || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedModule && oids.length === 0 && !loading && (
        <div style={{ color: '#666' }}>No OIDs found in this module.</div>
      )}
    </div>
  );
}
