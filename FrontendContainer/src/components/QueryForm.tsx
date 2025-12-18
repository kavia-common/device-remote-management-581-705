import React, { useState } from 'react';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useToastStore } from '../store/toast';

// PUBLIC_INTERFACE
export function QueryForm(): JSX.Element {
  /** Enhanced query form for protocol operations with validation. */
  const [protocol, setProtocol] = useState('SNMPv2');
  const [query, setQuery] = useState('1.3.6.1.2.1.1.1.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const addToast = useToastStore(s => s.addToast);

  const protocolOptions = [
    { value: 'SNMPv2', label: 'SNMP v2c' },
    { value: 'SNMPv3', label: 'SNMP v3' },
    { value: 'WebPA', label: 'WebPA' },
    { value: 'TR69', label: 'TR-069 (ACS)' },
    { value: 'USP', label: 'USP (TR-369)' },
  ];

  const validateQuery = (): boolean => {
    if (!query.trim()) {
      setError('Query parameter is required');
      return false;
    }
    
    if (protocol.includes('SNMP') && !/^\d+(\.\d+)*$/.test(query.trim())) {
      setError('Invalid OID format. Use dot notation (e.g., 1.3.6.1.2.1.1.1.0)');
      return false;
    }
    
    setError('');
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateQuery()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast(`${protocol} query executed successfully`, 'success');
      // In real implementation, this would call the API
    } catch (err) {
      addToast('Query execution failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Protocol"
          value={protocol}
          onChange={e => setProtocol(e.target.value)}
          options={protocolOptions}
          disabled={loading}
        />
        <Input
          label="Query Parameter"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setError('');
          }}
          error={error}
          placeholder="Enter OID or parameter path"
          disabled={loading}
          helperText={protocol.includes('SNMP') ? 'Example: 1.3.6.1.2.1.1.1.0' : 'Example: Device.WiFi.SSID.1.SSID'}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
          Execute Query
        </Button>
      </div>
    </form>
  );
}
