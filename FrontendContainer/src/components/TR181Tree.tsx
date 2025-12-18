import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface TR181Parameter {
  id: string;
  path: string;
  schema: Record<string, any>;
  created_at: string;
}

interface TreeNode {
  path: string;
  children: string[];
  parameters: TR181Parameter[];
}

// PUBLIC_INTERFACE
export function TR181Tree(): JSX.Element {
  /** TR-181 parameter browser with hierarchical tree view. */
  const [rootPath, setRootPath] = useState('Device.');
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [parameters, setParameters] = useState<TR181Parameter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTree();
    fetchParameters();
  }, [rootPath, searchTerm]);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const response = await api().get('/tr181/tree', {
        params: { root_path: rootPath }
      });
      setTree(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch TR-181 tree:', err);
      setError(err?.response?.data?.detail || 'Failed to load TR-181 tree');
    } finally {
      setLoading(false);
    }
  };

  const fetchParameters = async () => {
    try {
      const response = await api().get('/tr181/parameters', {
        params: {
          path_prefix: rootPath,
          search: searchTerm || undefined,
          limit: 50
        }
      });
      setParameters(response.data.items || response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch parameters:', err);
    }
  };

  const navigateToPath = (path: string) => {
    setRootPath(path);
    setSearchTerm('');
  };

  return (
    <div className="panel">
      <div className="row" style={{ gap: '12px', marginBottom: '16px' }}>
        <input 
          placeholder="Root path (e.g., Device.WiFi.)" 
          value={rootPath}
          onChange={e => setRootPath(e.target.value)}
          style={{ flex: 1 }}
        />
        <input 
          placeholder="Search parameters..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={fetchTree}>Refresh</button>
      </div>

      {error && (
        <div style={{ padding: '12px', color: '#c33', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading && <div>Loading...</div>}

      {tree && tree.children.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4>Child Paths</h4>
          <ul>
            {tree.children.map(child => (
              <li key={child}>
                <button 
                  className="ghost" 
                  onClick={() => navigateToPath(child)}
                  style={{ textDecoration: 'underline' }}
                >
                  {child}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parameters.length > 0 && (
        <div>
          <h4>Parameters</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Type</th>
                <th>Access</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map(param => (
                <tr key={param.id}>
                  <td><code>{param.path}</code></td>
                  <td>{param.schema?.type || '-'}</td>
                  <td>{param.schema?.access || '-'}</td>
                  <td>{param.schema?.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && parameters.length === 0 && (
        <div style={{ color: '#666' }}>
          No parameters found. Try adjusting the root path or search term.
        </div>
      )}
    </div>
  );
}
