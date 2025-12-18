import React from 'react';
import { DeviceTable } from '../components/DeviceTable';
import { DeviceForm } from '../components/DeviceForm';

// PUBLIC_INTERFACE
export default function Devices(): JSX.Element {
  /** Devices listing and quick add form */
  return (
    <div className="panel">
      <h2>Devices</h2>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <DeviceForm />
      </div>
      <div style={{ marginTop: 16 }}>
        <DeviceTable />
      </div>
    </div>
  );
}
