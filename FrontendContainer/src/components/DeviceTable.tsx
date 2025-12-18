import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { SkeletonTable } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { ErrorBanner } from './ui/ErrorBanner';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useToastStore } from '../store/toast';
import { Badge } from './ui/Badge';
import { cn } from '../utils/cn';

interface Device {
  id: string;
  name: string;
  ip: string;
  metadata?: Record<string, any>;
}

type SortKey = 'name' | 'ip' | 'status';
type SortOrder = 'asc' | 'desc';

// PUBLIC_INTERFACE
export function DeviceTable(): JSX.Element {
  /** Enhanced device table with sorting, pagination, and search. */
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    // Filter and sort devices
    let filtered = devices.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ip.includes(searchQuery)
    );

    filtered.sort((a, b) => {
      let aVal: string, bVal: string;
      
      if (sortKey === 'status') {
        aVal = a.metadata?.status || 'unknown';
        bVal = b.metadata?.status || 'unknown';
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }
      
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredDevices(filtered);
  }, [devices, searchQuery, sortKey, sortOrder]);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api().get('/devices');
      setDevices(response.data.items || response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch devices:', err);
      setError(err?.response?.data?.detail || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (device: Device) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;
    
    setDeleting(true);
    try {
      await api().delete(`/devices/${deviceToDelete.id}`);
      setDevices(devices.filter(d => d.id !== deviceToDelete.id));
      addToast('Device deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete device:', err);
      addToast(err?.response?.data?.detail || 'Failed to delete device', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return (
        <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return <SkeletonTable rows={5} />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchDevices} />;
  }

  if (devices.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        }
        title="No devices found"
        description="Get started by adding your first device using the form above."
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search devices by name or IP..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input max-w-md"
          aria-label="Search devices"
        />
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-panel border-b border-border sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-2 text-sm font-semibold text-text hover:text-accent transition-colors"
                  aria-label="Sort by device name"
                >
                  Device
                  <SortIcon columnKey="name" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => toggleSort('ip')}
                  className="flex items-center gap-2 text-sm font-semibold text-text hover:text-accent transition-colors"
                  aria-label="Sort by IP address"
                >
                  IP Address
                  <SortIcon columnKey="ip" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => toggleSort('status')}
                  className="flex items-center gap-2 text-sm font-semibold text-text hover:text-accent transition-colors"
                  aria-label="Sort by status"
                >
                  Status
                  <SortIcon columnKey="status" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-sm font-semibold text-text">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredDevices.map(d => (
              <tr key={d.id} className="hover:bg-panel/50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    to={`/devices/${d.id}`}
                    className="text-accent hover:underline font-medium"
                  >
                    {d.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted font-mono text-sm">{d.ip}</td>
                <td className="px-4 py-3">
                  <Badge variant="default">{d.metadata?.status || 'unknown'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(d)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDevices.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted">
          No devices match your search for "{searchQuery}"
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeviceToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Device"
        message={`Are you sure you want to delete "${deviceToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
      />
    </>
  );
}
