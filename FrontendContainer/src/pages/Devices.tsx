import React, { useState } from 'react';
import { DeviceTable } from '../components/DeviceTable';
import { DeviceForm } from '../components/DeviceForm';

// PUBLIC_INTERFACE
export default function Devices(): JSX.Element {
  /** Devices listing and creation page with live backend integration. */
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeviceAdded = () => {
    // Trigger table refresh by changing key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="panel">
      <h2>Devices</h2>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <DeviceForm onDeviceAdded={handleDeviceAdded} />
      </div>
      <div style={{ marginTop: 16 }}>
        <DeviceTable key={refreshKey} />
      </div>
    </div>
  );
}
