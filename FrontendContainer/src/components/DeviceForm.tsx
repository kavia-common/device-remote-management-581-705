import React, { useState } from 'react';
import { api } from '../services/api';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useToastStore } from '../store/toast';

interface DeviceFormProps {
  onDeviceAdded?: () => void;
}

// PUBLIC_INTERFACE
export function DeviceForm({ onDeviceAdded }: DeviceFormProps = {}): JSX.Element {
  /** Device creation form with client-side validation. */
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; ip?: string }>({});
  
  const addToast = useToastStore(s => s.addToast);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; ip?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Device name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    if (!ip.trim()) {
      newErrors.ip = 'IP address is required';
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim())) {
      newErrors.ip = 'Please enter a valid IP address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      await api().post('/devices', {
        name: name.trim(),
        ip: ip.trim(),
        metadata: {}
      });

      setName('');
      setIp('');
      addToast('Device added successfully!', 'success');

      if (onDeviceAdded) {
        onDeviceAdded();
      }
    } catch (err: any) {
      console.error('Failed to add device:', err);
      const message = err?.response?.data?.detail || 'Failed to add device';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-3 flex-wrap items-start w-full">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Device name"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setErrors(prev => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          disabled={loading}
          required
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="IP address (e.g., 192.168.1.1)"
          value={ip}
          onChange={e => {
            setIp(e.target.value);
            setErrors(prev => ({ ...prev, ip: undefined }));
          }}
          error={errors.ip}
          disabled={loading}
          required
        />
      </div>
      <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
        Add Device
      </Button>
    </form>
  );
}
