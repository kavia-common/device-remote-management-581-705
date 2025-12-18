import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSSE, getSSEUrl } from '../utils/realtime';

interface Job {
  id: string;
  kind: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  device_id?: string;
  created_at: string;
  updated_at?: string;
}

// PUBLIC_INTERFACE
export function JobList(): JSX.Element {
  /** Job list with real-time status updates via SSE. */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // SSE connection for selected job progress
  const sseUrl = selectedJobId ? getSSEUrl(`/jobs/events/${selectedJobId}`) : null;
  const { data: jobUpdate } = useSSE(sseUrl, !!selectedJobId);

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update job status when SSE event received
    if (jobUpdate && selectedJobId) {
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === selectedJobId 
            ? { ...job, status: jobUpdate.status, updated_at: jobUpdate.updated_at }
            : job
        )
      );
    }
  }, [jobUpdate, selectedJobId]);

  const fetchJobs = async () => {
    try {
      const response = await api().get('/jobs', {
        params: { limit: 50, skip: 0 }
      });
      setJobs(response.data.items || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch jobs:', err);
      setError(err?.response?.data?.detail || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#2a7';
      case 'failed': return '#c33';
      case 'running': return '#37c';
      case 'cancelled': return '#999';
      default: return '#fa0';
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading jobs...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#c33' }}>
        {error}
        <button onClick={fetchJobs} style={{ marginLeft: '12px' }}>Retry</button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return <div style={{ padding: '20px', color: '#666' }}>No jobs found.</div>;
  }

  return (
    <div>
      <table className="table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id}>
              <td><small>{j.id}</small></td>
              <td>{j.kind}</td>
              <td>
                <span 
                  className="badge" 
                  style={{ backgroundColor: getStatusColor(j.status) }}
                >
                  {j.status}
                </span>
              </td>
              <td><small>{new Date(j.created_at).toLocaleString()}</small></td>
              <td>
                <button 
                  className="ghost" 
                  onClick={() => setSelectedJobId(j.id === selectedJobId ? null : j.id)}
                  style={{ fontSize: '0.85em', padding: '4px 8px' }}
                >
                  {j.id === selectedJobId ? 'Stop watching' : 'Watch'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedJobId && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
          <strong>Watching job {selectedJobId}</strong>
          {jobUpdate && (
            <pre style={{ marginTop: '8px', fontSize: '0.9em' }}>
              {JSON.stringify(jobUpdate, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
