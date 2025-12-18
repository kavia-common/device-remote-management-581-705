import React from 'react';
import { useParams } from 'react-router-dom';
import { QueryForm } from '../components/QueryForm';
import { ResultViewer } from '../components/ResultViewer';

// PUBLIC_INTERFACE
export default function DeviceDetail(): JSX.Element {
  /** Placeholder device detail page with query form and result viewer */
  const { id } = useParams();
  return (
    <div className="panel">
      <h2>Device Detail</h2>
      <p>ID: {id}</p>
      <QueryForm />
      <div style={{ marginTop: 12 }}>
        <ResultViewer />
      </div>
    </div>
  );
}
