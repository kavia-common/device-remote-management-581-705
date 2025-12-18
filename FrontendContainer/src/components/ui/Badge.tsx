import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  live?: boolean;
  className?: string;
}

// PUBLIC_INTERFACE
export function Badge({ children, variant = 'default', live = false, className }: BadgeProps): JSX.Element {
  /** Badge component for status indicators with optional live indicator. */
  const variantClasses = {
    default: 'badge-default',
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
    info: 'badge-info',
  };

  return (
    <span className={cn('badge', variantClasses[variant], className)}>
      {live && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
