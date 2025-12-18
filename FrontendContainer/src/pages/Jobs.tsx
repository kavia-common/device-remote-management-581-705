import React from 'react';
import { JobList } from '../components/JobList';

// PUBLIC_INTERFACE
export default function Jobs(): JSX.Element {
  /** Placeholder jobs page */
  return (
    <div className="panel">
      <h2>Jobs</h2>
      <JobList />
    </div>
  );
}
