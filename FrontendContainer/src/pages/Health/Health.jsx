import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// PUBLIC_INTERFACE
function Health() {
  /**
   * Health check page for monitoring system status
   */
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    checkHealth();
  }, []);
  
  const checkHealth = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/health`);
      setHealth(response.data);
    } catch (err) {
      setError('Failed to fetch health status');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (status) => {
    if (status === 'healthy' || status === 'ok') {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    return <XCircle className="w-6 h-6 text-red-600" />;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Activity className="w-16 h-16 mx-auto mb-4 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">System Health Check</h1>
          <p className="mt-2 text-gray-600">Monitor the status of backend services</p>
        </div>
        
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Health Status</h2>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="btn btn-secondary inline-flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {loading && !health && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
              <p className="text-gray-600">Checking health status...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-3" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {health && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Overall Status</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {health.status === 'healthy' || health.status === 'ok' 
                      ? 'All systems operational' 
                      : 'System experiencing issues'}
                  </p>
                </div>
                {getStatusIcon(health.status)}
              </div>
              
              {health.database && (
                <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Database</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {health.database.status === 'healthy' || health.database.status === 'connected'
                        ? 'Connected and operational'
                        : 'Connection issues detected'}
                    </p>
                  </div>
                  {getStatusIcon(health.database.status)}
                </div>
              )}
              
              {health.timestamp && (
                <div className="text-sm text-gray-600 text-center mt-4">
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <a href="/login" className="text-primary-600 hover:text-primary-700">
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}

export default Health;
