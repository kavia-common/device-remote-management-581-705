import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

// PUBLIC_INTERFACE
export function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  /** Route guard that redirects to login if user is not authenticated. */
  const token = useAuthStore(state => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
