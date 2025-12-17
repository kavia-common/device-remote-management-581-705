import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PlayCircle, AlertCircle } from 'lucide-react';
import { deviceService } from '../../services/deviceService';
import { queryService } from '../../services/queryService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// PUBLIC_INTERFACE
function QueryBuilder() {
  /**
   * Query builder page for executing device queries
   */
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  
  const selectedProtocol = watch('protocol_type');
  
  useEffect(() => {
    loadDevices();
  }, []);
  
  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await deviceService.getDevices({ limit: 100 });
      setDevices(data.devices || []);
    } catch (err) {
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data) => {
    setExecuting(true);
    setError('');
    setResult(null);
    
    try {
      const response = await queryService.executeQuery({
        device_id: data.device_id,
        protocol_type: data.protocol_type,
        query_type: data.query_type,
        query_parameters: {
          oid: data.oid,
          parameter: data.parameter,
          command: data.command,
        },
      });
      
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute query');
    } finally {
      setExecuting(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading devices..." />;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Query Builder</h1>
        <p className="mt-2 text-gray-600">Execute queries on your devices</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Configuration</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="device_id" className="block text-sm font-medium text-gray-700 mb-1">
                Select Device *
              </label>
              <select
                id="device_id"
                className="input"
                {...register('device_id', { required: 'Device is required' })}
              >
                <option value="">Choose a device...</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.ip_address})
                  </option>
                ))}
              </select>
              {errors.device_id && (
                <p className="mt-1 text-sm text-red-600">{errors.device_id.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="protocol_type" className="block text-sm font-medium text-gray-700 mb-1">
                Protocol *
              </label>
              <select
                id="protocol_type"
                className="input"
                {...register('protocol_type', { required: 'Protocol is required' })}
              >
                <option value="">Choose a protocol...</option>
                <option value="snmp">SNMP</option>
                <option value="webpa">WebPA</option>
                <option value="tr69">TR-069/ACS</option>
                <option value="tr369">TR-369/USP</option>
              </select>
              {errors.protocol_type && (
                <p className="mt-1 text-sm text-red-600">{errors.protocol_type.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="query_type" className="block text-sm font-medium text-gray-700 mb-1">
                Query Type *
              </label>
              <select
                id="query_type"
                className="input"
                {...register('query_type', { required: 'Query type is required' })}
              >
                <option value="">Choose query type...</option>
                <option value="get">Get Value</option>
                <option value="set">Set Value</option>
                <option value="walk">Walk (SNMP)</option>
              </select>
              {errors.query_type && (
                <p className="mt-1 text-sm text-red-600">{errors.query_type.message}</p>
              )}
            </div>
            
            {/* Protocol-specific fields */}
            {selectedProtocol === 'snmp' && (
              <div>
                <label htmlFor="oid" className="block text-sm font-medium text-gray-700 mb-1">
                  OID
                </label>
                <input
                  id="oid"
                  type="text"
                  placeholder="1.3.6.1.2.1.1.1.0"
                  className="input"
                  {...register('oid')}
                />
              </div>
            )}
            
            {(selectedProtocol === 'webpa' || selectedProtocol === 'tr69' || selectedProtocol === 'tr369') && (
              <div>
                <label htmlFor="parameter" className="block text-sm font-medium text-gray-700 mb-1">
                  Parameter Path
                </label>
                <input
                  id="parameter"
                  type="text"
                  placeholder="Device.DeviceInfo.SoftwareVersion"
                  className="input"
                  {...register('parameter')}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Parameters (JSON)
              </label>
              <textarea
                id="command"
                rows="3"
                placeholder='{"key": "value"}'
                className="input"
                {...register('command')}
              />
            </div>
            
            <button
              type="submit"
              disabled={executing}
              className="w-full btn btn-primary inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              {executing ? 'Executing...' : 'Execute Query'}
            </button>
          </form>
        </div>
        
        {/* Result Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Result</h2>
          
          {!result && !error && (
            <div className="text-center py-12 text-gray-500">
              <PlayCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Execute a query to see results</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Query ID</p>
                <p className="text-sm text-gray-900 font-mono">{result.query_id}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Status</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                    result.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {result.status}
                </span>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Query submitted successfully. Check Query History for results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QueryBuilder;
