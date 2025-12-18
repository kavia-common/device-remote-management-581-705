import React from 'react';

// PUBLIC_INTERFACE
export function ResultViewer(): JSX.Element {
  /** Placeholder result viewer panel. */
  return (
    <div className="panel">
      <h3>Results</h3>
      <pre style={{ overflowX: 'auto' }}>
{`{
  "sysDescr": "Example Device OS v1.0",
  "uptime": 1234567
}`}
      </pre>
    </div>
  );
}
