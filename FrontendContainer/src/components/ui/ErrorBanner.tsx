import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

// PUBLIC_INTERFACE
export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps): JSX.Element {
  /** Error banner component with optional retry action. */
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500',
        className
      )}
      role="alert"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
