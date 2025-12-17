import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { deviceService } from '../../services/deviceService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';

// PUBLIC_INTERFACE
function DeviceEdit() {
  /**
   * Device edit page with pre-populated form
   */
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState(null);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  
  useEffect(() => {
    loadDevice();
  }, [id]);
  
  const loadDevice = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await deviceService.getDevice(id);
      setDevice(data);
      reset(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load device');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data) => {
    setSaving(true);
    setError('');
    
    try {
      await deviceService.updateDevice(id, data);
      navigate(`/devices/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update device');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading device..." />;
  }
  
  if (error && !device) {
    return <ErrorMessage message={error} onRetry={loadDevice} />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to={`/devices/${id}`} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Device</h1>
          <p className="mt-1 text-gray-600">{device?.name}</p>
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
                className="input"
                {...register('mac_address')}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Link to={`/devices/${id}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeviceEdit;
