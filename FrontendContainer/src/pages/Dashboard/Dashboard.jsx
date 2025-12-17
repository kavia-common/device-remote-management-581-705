import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Server, PlayCircle, History, CheckCircle, XCircle } from 'lucide-react';
import { deviceService } from '../../services/deviceService';
import { queryService } from '../../services/queryService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';

// PUBLIC_INTERFACE
function Dashboard() {
  /**
   * Dashboard page showing overview statistics and recent activity
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    totalQueries: 0,
    recentQueries: [],
  });
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [devicesData, queriesData] = await Promise.all([
        deviceService.getDevices({ limit: 100 }),
        queryService.getQueryHistory({ limit: 5 }),
      ]);
      
      setStats({
        totalDevices: devicesData.total || 0,
        activeDevices: devicesData.devices?.filter(d => d.status === 'active').length || 0,
        totalQueries: queriesData.total || 0,
        recentQueries: queriesData.queries || [],
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} onRetry={loadDashboardData} />;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your device management platform</p>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 text-primary-600">
              <Server className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDevices}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDevices}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQueries}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <History className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Queries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentQueries.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/devices/new"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Server className="w-8 h-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900">Add Device</h3>
            <p className="text-sm text-gray-600 mt-1">Register a new device</p>
          </Link>
          
          <Link
            to="/queries"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <PlayCircle className="w-8 h-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900">Execute Query</h3>
            <p className="text-sm text-gray-600 mt-1">Run a device query</p>
          </Link>
          
          <Link
            to="/queries/history"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <History className="w-8 h-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900">View History</h3>
            <p className="text-sm text-gray-600 mt-1">Check query history</p>
          </Link>
        </div>
      </div>
      
      {/* Recent Queries */}
      {stats.recentQueries.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Queries</h2>
          <div className="space-y-3">
            {stats.recentQueries.map((query) => (
              <div key={query.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{query.device_name}</p>
                  <p className="text-sm text-gray-600">
                    {query.protocol_type} - {query.query_type}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
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
                  <Link
                    to={`/queries/history`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
