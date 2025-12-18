import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

// PUBLIC_INTERFACE
export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps): JSX.Element {
  /** Skeleton loader for content placeholders during loading. */
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-border',
        variantClasses[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}

// PUBLIC_INTERFACE
export function SkeletonTable({ rows = 5 }: { rows?: number }): JSX.Element {
  /** Skeleton loader for table layout. */
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
