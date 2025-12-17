import React, { useState, useEffect } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { queryService } from '../../services/queryService';
import { deviceService } from '../../services/deviceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';

// PUBLIC_INTERFACE
function QueryHistory() {
  /**
   * Query history page showing past query executions
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queries, setQueries] = useState([]);
  const [devices, setDevices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  
  useEffect(() => {
    loadData();
  }, [statusFilter, deviceFilter]);
  
  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (deviceFilter) params.device_id = deviceFilter;
      
      const [queriesData, devicesData] = await Promise.all([
        queryService.getQueryHistory(params),
        deviceService.getDevices({ limit: 100 }),
      ]);
      
      setQueries(queriesData.queries || []);
      setDevices(devicesData.devices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load query history');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && queries.length === 0) {
    return <LoadingSpinner message="Loading query history..." />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Query History</h1>
          <p className="mt-2 text-gray-600">View past query executions and results</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary inline-flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device
            </label>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="input"
            >
              <option value="">All Devices</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>
      
      {error && <ErrorMessage message={error} onRetry={loadData} />}
      
      {/* Query Table */}
      <div className="table-container">
        {queries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No queries found</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Protocol</th>
                <th>Query Type</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {queries.map((query) => (
                <tr key={query.id}>
                  <td className="font-medium">{query.device_name}</td>
                  <td>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {query.protocol_type}
                    </span>
                  </td>
                  <td>{query.query_type}</td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        query.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : query.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {query.status}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">
                    {new Date(query.created_at).toLocaleString()}
                  </td>
                  <td className="text-sm text-gray-600">
                    {query.execution_time_ms ? `${query.execution_time_ms}ms` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default QueryHistory;
