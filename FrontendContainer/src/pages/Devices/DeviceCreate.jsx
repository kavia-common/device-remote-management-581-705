import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { deviceService } from '../../services/deviceService';

// PUBLIC_INTERFACE
function DeviceCreate() {
  /**
   * Device creation page with form validation
   */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    
    try {
      const device = await deviceService.createDevice(data);
      navigate(`/devices/${device.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create device');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/devices" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Device</h1>
          <p className="mt-1 text-gray-600">Register a new device to the platform</p>
        </div>
      </div>
      
      <div className="card max-w-2xl">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Device Name *
            </label>
            <input
              id="name"
              type="text"
              className="input"
              {...register('name', { required: 'Device name is required' })}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="device_type" className="block text-sm font-medium text-gray-700 mb-1">
                Device Type
              </label>
              <input
                id="device_type"
                type="text"
                placeholder="e.g., Router, Gateway, STB"
                className="input"
                {...register('device_type')}
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select id="status" className="input" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                id="manufacturer"
                type="text"
                className="input"
                {...register('manufacturer')}
              />
            </div>
            
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                id="model"
                type="text"
                className="input"
                {...register('model')}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                id="serial_number"
                type="text"
                className="input"
                {...register('serial_number')}
              />
            </div>
            
            <div>
              <label htmlFor="firmware_version" className="block text-sm font-medium text-gray-700 mb-1">
                Firmware Version
              </label>
              <input
                id="firmware_version"
                type="text"
                className="input"
                {...register('firmware_version')}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                id="ip_address"
                type="text"
                placeholder="192.168.1.1"
                className="input"
                {...register('ip_address')}
              />
            </div>
            
            <div>
              <label htmlFor="mac_address" className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address
              </label>
              <input
                id="mac_address"
                type="text"
                placeholder="00:11:22:33:44:55"
                className="input"
                {...register('mac_address')}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Link to="/devices" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeviceCreate;
