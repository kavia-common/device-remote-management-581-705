import React from 'react';
import { MIBTree } from '../components/MIBTree';

// PUBLIC_INTERFACE
export default function MIBBrowser(): JSX.Element {
  /** Placeholder MIB Browser */
  return (
    <div className="panel">
      <h2>MIB Browser</h2>
      <MIBTree />
    </div>
  );
}
