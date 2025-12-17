import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { deviceService } from '../../services/deviceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';

// PUBLIC_INTERFACE
function DeviceList() {
  /**
   * Device list page with CRUD operations and filtering
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    loadDevices();
  }, []);
  
  const loadDevices = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await deviceService.getDevices({ limit: 100 });
      setDevices(data.devices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this device?')) {
      return;
    }
    
    try {
      await deviceService.deleteDevice(id);
      setDevices(devices.filter(d => d.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete device');
    }
  };
  
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.ip_address?.includes(searchTerm);
    const matchesStatus = !statusFilter || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  if (loading) {
    return <LoadingSpinner message="Loading devices..." />;
  }
  
  if (error) {
    return <ErrorMessage message={error} onRetry={loadDevices} />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="mt-2 text-gray-600">Manage your network devices</p>
        </div>
        <Link to="/devices/new" className="btn btn-primary inline-flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Link>
      </div>
      
      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Device Table */}
      <div className="table-container">
        {filteredDevices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No devices found</p>
            <Link to="/devices/new" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
              Add your first device
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Protocols</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.map((device) => (
                <tr key={device.id}>
                  <td className="font-medium">{device.name}</td>
                  <td>{device.device_type || '-'}</td>
                  <td>{device.ip_address || '-'}</td>
                  <td>
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
                  </td>
                  <td>
                    {device.protocols && device.protocols.length > 0
                      ? device.protocols.map(p => p.protocol_type).join(', ')
                      : '-'}
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/devices/${device.id}`}
                        className="text-primary-600 hover:text-primary-700"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/devices/${device.id}/edit`}
                        className="text-blue-600 hover:text-blue-700"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(device.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

export default DeviceList;
