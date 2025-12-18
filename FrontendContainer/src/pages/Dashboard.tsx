import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';

interface DashboardStats {
  total_devices: number;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
}

// PUBLIC_INTERFACE
export default function Dashboard(): JSX.Element {
  /** Dashboard with overview statistics and quick actions. */
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch devices and jobs for stats
      const [devicesRes, jobsRes] = await Promise.all([
        api().get('/devices'),
        api().get('/jobs', { params: { limit: 100 } })
      ]);

      const devices = devicesRes.data.items || devicesRes.data || [];
      const jobs = jobsRes.data.items || jobsRes.data || [];

      setStats({
        total_devices: devices.length,
        active_jobs: jobs.filter((j: any) => j.status === 'running' || j.status === 'pending').length,
        completed_jobs: jobs.filter((j: any) => j.status === 'completed').length,
        failed_jobs: jobs.filter((j: any) => j.status === 'failed').length,
      });
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard data');
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
    return <ErrorBanner message={error} onRetry={fetchStats} />;
  }

  const statCards = [
    {
      label: 'Total Devices',
      value: stats?.total_devices || 0,
      icon: '🖥️',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/devices'
    },
    {
      label: 'Active Jobs',
      value: stats?.active_jobs || 0,
      icon: '⚙️',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      link: '/jobs'
    },
    {
      label: 'Completed Jobs',
      value: stats?.completed_jobs || 0,
      icon: '✅',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/jobs'
    },
    {
      label: 'Failed Jobs',
      value: stats?.failed_jobs || 0,
      icon: '❌',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      link: '/jobs'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
        <p className="text-muted">Welcome to the Device Remote Management platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="panel hover:border-accent transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-text">{card.value}</p>
              </div>
              <div className={cn('text-4xl p-3 rounded-lg', card.bgColor)}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel">
          <h2 className="text-xl font-semibold text-text mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/devices"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors"
            >
              <span className="text-2xl">➕</span>
              <div>
                <p className="font-medium text-text">Add New Device</p>
                <p className="text-sm text-muted">Register a device for management</p>
              </div>
            </Link>
            <Link
              to="/jobs"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <p className="font-medium text-text">Execute Query</p>
                <p className="text-sm text-muted">Run protocol operations on devices</p>
              </div>
            </Link>
            <Link
              to="/mib-browser"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors"
            >
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-medium text-text">Browse MIB</p>
                <p className="text-sm text-muted">Explore SNMP MIB definitions</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="panel">
          <h2 className="text-xl font-semibold text-text mb-4">Supported Protocols</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="info">SNMP</Badge>
              <span className="text-sm text-muted">v2c and v3 support</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info">WebPA</Badge>
              <span className="text-sm text-muted">HTTP-based management</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info">TR-069</Badge>
              <span className="text-sm text-muted">ACS integration</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info">USP</Badge>
              <span className="text-sm text-muted">TR-369 protocol</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
