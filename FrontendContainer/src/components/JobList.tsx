import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSSE, getSSEUrl } from '../utils/realtime';
import { SkeletonTable } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { ErrorBanner } from './ui/ErrorBanner';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../utils/cn';

interface Job {
  id: string;
  kind: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  device_id?: string;
  created_at: string;
  updated_at?: string;
}

type SortKey = 'created_at' | 'kind' | 'status';
type SortOrder = 'asc' | 'desc';

// PUBLIC_INTERFACE
export function JobList(): JSX.Element {
  /** Enhanced job list with real-time updates, sorting, and filtering. */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sseUrl = selectedJobId ? getSSEUrl(`/jobs/events/${selectedJobId}`) : null;
  const { data: jobUpdate } = useSSE(sseUrl, !!selectedJobId);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    let filtered = jobs.filter(j => {
      const matchesSearch = j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.kind.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortKey === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === 'kind') {
        comparison = a.kind.localeCompare(b.kind);
      } else if (sortKey === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredJobs(filtered);
  }, [jobs, searchQuery, filterStatus, sortKey, sortOrder]);

  const fetchJobs = async () => {
    try {
      const response = await api().get('/jobs', {
        params: { limit: 100, skip: 0 }
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

  const getStatusBadge = (status: string, isLive: boolean) => {
    const variants: Record<string, any> = {
      completed: 'success',
      failed: 'error',
      running: 'info',
      cancelled: 'default',
      pending: 'warning',
    };
    
    return (
      <Badge variant={variants[status] || 'default'} live={isLive && status === 'running'}>
        {status}
      </Badge>
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return <SkeletonTable rows={5} />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchJobs} />;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="No jobs found"
        description="Jobs will appear here once you start executing device operations."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input flex-1"
          aria-label="Search jobs"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input sm:w-48"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-panel border-b border-border sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-text">Job ID</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-text">Type</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-text">Status</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-text">Created</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredJobs.map(j => (
              <tr key={j.id} className="hover:bg-panel/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-muted">{j.id.slice(0, 8)}...</span>
                </td>
                <td className="px-4 py-3 text-sm text-text">{j.kind}</td>
                <td className="px-4 py-3">
                  {getStatusBadge(j.status, j.id === selectedJobId)}
                </td>
                <td className="px-4 py-3 text-sm text-muted">
                  {new Date(j.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedJobId(j.id === selectedJobId ? null : j.id)}
                  >
                    {j.id === selectedJobId ? 'Stop watching' : 'Watch'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredJobs.length === 0 && (searchQuery || filterStatus !== 'all') && (
        <div className="text-center py-8 text-muted">
          No jobs match your filters
        </div>
      )}

      {selectedJobId && jobUpdate && (
        <div className="panel">
          <h3 className="text-lg font-semibold text-text mb-3">Live Job Updates</h3>
          <pre className="bg-bg p-4 rounded-lg overflow-x-auto text-xs text-muted">
            {JSON.stringify(jobUpdate, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
