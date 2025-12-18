import React from 'react';

interface ResultViewerProps {
  result: any;
  loading?: boolean;
  error?: string | null;
}

// PUBLIC_INTERFACE
export function ResultViewer({ result, loading, error }: ResultViewerProps): JSX.Element {
  /** Displays job results with proper formatting and error handling. */
  
  if (loading) {
    return (
      <div className="panel">
        <h3>Results</h3>
        <div style={{ padding: '20px', color: '#666' }}>Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h3>Results</h3>
        <div style={{ padding: '12px', background: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel">
        <h3>Results</h3>
        <div style={{ padding: '20px', color: '#666' }}>No results yet.</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Results</h3>
      <pre style={{ 
        overflowX: 'auto', 
        background: '#f5f5f5', 
        padding: '16px', 
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
