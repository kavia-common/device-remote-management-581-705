import React from 'react';
import { Toast, type ToastType } from './Toast';
import { useToastStore } from '../../store/toast';

// PUBLIC_INTERFACE
export function ToastContainer(): JSX.Element {
  /** Container for displaying toast notifications in fixed position. */
  const toasts = useToastStore(state => state.toasts);
  const removeToast = useToastStore(state => state.removeToast);

  if (toasts.length === 0) {
    return <></>;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="pointer-events-auto">
        {toasts.map(toast => (
          <div key={toast.id} className="mb-2">
            <Toast toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </div>
  );
}
