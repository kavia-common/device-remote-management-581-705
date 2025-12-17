import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { auditService } from '../../services/auditService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';

// PUBLIC_INTERFACE
function AuditLogs() {
  /**
   * Audit logs page showing system activity trail
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  
  useEffect(() => {
    loadLogs();
  }, [actionFilter]);
  
  const loadLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = { limit: 100 };
      if (actionFilter) params.action = actionFilter;
      
      // Note: Backend endpoint needs to be implemented
      // For now, this will show a placeholder or error
      const data = await auditService.getAuditLogs(params);
      setLogs(data.logs || []);
    } catch (err) {
      // If endpoint not implemented, show friendly message
      if (err.response?.status === 404) {
        setError('Audit logs endpoint is not yet implemented in the backend.');
      } else {
        setError(err.response?.data?.error || 'Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && logs.length === 0) {
    return <LoadingSpinner message="Loading audit logs..." />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-gray-600">System activity and user actions trail</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="btn btn-secondary inline-flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="input"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>
        </div>
      </div>
      
      {error && <ErrorMessage message={error} onRetry={loadLogs} />}
      
      {/* Logs Table */}
      <div className="table-container">
        {logs.length === 0 && !error ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-2">
              Note: Backend audit logs endpoint needs to be implemented
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="font-medium">{log.user_email || log.user_id}</td>
                  <td>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {log.action}
                    </span>
                  </td>
                  <td>{log.resource_type}</td>
                  <td className="text-sm text-gray-600">
                    {log.details ? JSON.stringify(log.details).substring(0, 50) : '-'}
                  </td>
                  <td className="text-sm text-gray-600">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AuditLogs;
