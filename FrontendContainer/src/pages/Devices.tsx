import React, { useState } from 'react';
import { DeviceTable } from '../components/DeviceTable';
import { DeviceForm } from '../components/DeviceForm';

// PUBLIC_INTERFACE
export default function Devices(): JSX.Element {
  /** Devices management page with list and creation form. */
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeviceAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Devices</h1>
        <p className="text-muted">Manage your network devices</p>
      </div>
      
      <div className="panel">
        <h2 className="text-lg font-semibold text-text mb-4">Add New Device</h2>
        <DeviceForm onDeviceAdded={handleDeviceAdded} />
      </div>
      
      <div className="panel">
        <h2 className="text-lg font-semibold text-text mb-4">Your Devices</h2>
        <DeviceTable key={refreshKey} />
      </div>
    </div>
  );
}
