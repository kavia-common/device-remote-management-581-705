import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Server } from 'lucide-react';
import { deviceService } from '../../services/deviceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';

// PUBLIC_INTERFACE
function DeviceDetail() {
  /**
   * Device detail page showing full device information and protocols
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [device, setDevice] = useState(null);
  
  useEffect(() => {
    loadDevice();
  }, [id]);
  
  const loadDevice = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await deviceService.getDevice(id);
      setDevice(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load device');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this device?')) {
      return;
    }
    
    try {
      await deviceService.deleteDevice(id);
      navigate('/devices');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete device');
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading device..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} onRetry={loadDevice} />;
  }
  
  if (!device) {
    return <ErrorMessage message="Device not found" />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/devices" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{device.name}</h1>
            <p className="mt-1 text-gray-600">{device.device_type || 'Network Device'}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link to={`/devices/${id}/edit`} className="btn btn-secondary inline-flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button onClick={handleDelete} className="btn btn-danger inline-flex items-center">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>
      
      {/* Device Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Device Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.device_type || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  device.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : device.status === 'inactive'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {device.status || 'unknown'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.manufacturer || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Model</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.model || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.serial_number || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Firmware Version</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.firmware_version || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">IP Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.ip_address || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">MAC Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{device.mac_address || '-'}</dd>
          </div>
        </dl>
      </div>
      
      {/* Protocols */}
      {device.protocols && device.protocols.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configured Protocols</h2>
          <div className="space-y-3">
            {device.protocols.map((protocol, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{protocol.protocol_type}</h3>
                    <p className="text-sm text-gray-600">
                      Status: {protocol.is_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceDetail;
