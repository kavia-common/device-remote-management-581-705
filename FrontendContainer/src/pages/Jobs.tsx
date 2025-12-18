import React, { useState } from 'react';
import { JobList } from '../components/JobList';
import { api } from '../services/api';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToastStore } from '../store/toast';

// PUBLIC_INTERFACE
export default function Jobs(): JSX.Element {
  /** Jobs page with enhanced job enqueueing and monitoring. */
  const [protocol, setProtocol] = useState<'snmp' | 'webpa' | 'tr069' | 'usp'>('snmp');
  const [operation, setOperation] = useState<'get' | 'set' | 'bulkwalk'>('get');
  const [deviceId, setDeviceId] = useState('');
  const [params, setParams] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ deviceId?: string; params?: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  
  const addToast = useToastStore(s => s.addToast);

  const validateForm = (): boolean => {
    const newErrors: { deviceId?: string; params?: string } = {};
    
    if (!deviceId.trim()) {
      newErrors.deviceId = 'Device ID is required';
    }
    
    try {
      JSON.parse(params);
    } catch (e) {
      newErrors.params = 'Invalid JSON format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const enqueueJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const parsedParams = JSON.parse(params);
      const endpoint = `/jobs/enqueue/${protocol}/${operation}`;
      
      await api().post(endpoint, {
        device_id: deviceId.trim(),
        params: parsedParams
      });

      addToast('Job enqueued successfully', 'success');
      setRefreshKey(prev => prev + 1);
      setParams('{}');
      setDeviceId('');
    } catch (err: any) {
      console.error('Failed to enqueue job:', err);
      const message = err?.response?.data?.detail || 'Failed to enqueue job';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const protocolOptions = [
    { value: 'snmp', label: 'SNMP' },
    { value: 'webpa', label: 'WebPA' },
    { value: 'tr069', label: 'TR-069' },
    { value: 'usp', label: 'USP' },
  ];

  const operationOptions = protocol === 'snmp'
    ? [
        { value: 'get', label: 'GET' },
        { value: 'set', label: 'SET' },
        { value: 'bulkwalk', label: 'BULKWALK' },
      ]
    : [
        { value: 'get', label: 'GET' },
        { value: 'set', label: 'SET' },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Jobs</h1>
        <p className="text-muted">Enqueue and monitor device operations</p>
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">Enqueue New Job</h2>
        <form onSubmit={enqueueJob} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Protocol"
              value={protocol}
              onChange={(e) => {
                setProtocol(e.target.value as any);
                if (e.target.value !== 'snmp' && operation === 'bulkwalk') {
                  setOperation('get');
                }
              }}
              options={protocolOptions}
              disabled={loading}
            />
            
            <Select
              label="Operation"
              value={operation}
              onChange={(e) => setOperation(e.target.value as any)}
              options={operationOptions}
              disabled={loading}
            />

            <Input
              label="Device ID"
              placeholder="Enter device ID"
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value);
                setErrors(prev => ({ ...prev, deviceId: undefined }));
              }}
              error={errors.deviceId}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="params" className="label">
              Parameters (JSON)
            </label>
            <textarea
              id="params"
              placeholder='{"oid": "1.3.6.1.2.1.1.1.0"}'
              value={params}
              onChange={(e) => {
                setParams(e.target.value);
                setErrors(prev => ({ ...prev, params: undefined }));
              }}
              rows={4}
              className="input font-mono text-sm"
              disabled={loading}
            />
            {errors.params && (
              <p className="error-text">{errors.params}</p>
            )}
            <p className="text-sm text-muted mt-1">
              Example for SNMP GET: {`{"oid": "1.3.6.1.2.1.1.1.0"}`}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={loading}
            >
              Enqueue Job
            </Button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">Job Queue</h2>
        <JobList key={refreshKey} />
      </div>
    </div>
  );
}
