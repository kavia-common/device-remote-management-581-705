import React from 'react';

// PUBLIC_INTERFACE
export function MIBTree(): JSX.Element {
  /** Placeholder MIB tree view. */
  return (
    <div className="panel">
      <p>Tree of MIB OIDs will be shown here.</p>
      <ul>
        <li>1.3.6.1.2.1 (mib-2)
          <ul>
            <li>1.3.6.1.2.1.1 (system)</li>
            <li>1.3.6.1.2.1.2 (interfaces)</li>
          </ul>
        </li>
      </ul>
    </div>
  );
}
