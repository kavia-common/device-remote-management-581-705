import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QueryForm } from '../components/QueryForm';
import { ResultViewer } from '../components/ResultViewer';
import { api } from '../services/api';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Badge } from '../components/ui/Badge';

interface Device {
  id: string;
  name: string;
  ip: string;
  metadata?: Record<string, any>;
}

// PUBLIC_INTERFACE
export default function DeviceDetail(): JSX.Element {
  /** Device detail page with query execution and result display. */
  const { id } = useParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchDevice(id);
    }
  }, [id]);

  const fetchDevice = async (deviceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api().get(`/devices/${deviceId}`);
      setDevice(response.data);
    } catch (err: any) {
      console.error('Failed to fetch device:', err);
      setError(err?.response?.data?.detail || 'Failed to load device details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner 
        message={error} 
        onRetry={() => id && fetchDevice(id)} 
      />
    );
  }

  if (!device) {
    return (
      <div className="panel text-center">
        <h2 className="text-xl font-semibold text-text mb-2">Device Not Found</h2>
        <p className="text-muted mb-6">The device you're looking for doesn't exist.</p>
        <Link to="/devices" className="text-accent hover:underline">
          Back to Devices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">{device.name}</h1>
            <div className="flex items-center gap-4 text-muted">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {device.ip}
              </span>
              <Badge variant="default">
                {device.metadata?.status || 'unknown'}
              </Badge>
            </div>
          </div>
          <Link to="/devices" className="text-accent hover:underline text-sm">
            ← Back to Devices
          </Link>
        </div>
        
        {device.metadata && Object.keys(device.metadata).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-text mb-2">Metadata</h3>
            <pre className="bg-bg p-3 rounded-lg text-xs text-muted overflow-x-auto">
              {JSON.stringify(device.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="text-xl font-semibold text-text mb-4">Execute Query</h2>
        <QueryForm />
      </div>

      {queryResult && (
        <div className="panel">
          <h2 className="text-xl font-semibold text-text mb-4">Query Results</h2>
          <ResultViewer result={queryResult} />
        </div>
      )}
    </div>
  );
}
