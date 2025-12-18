import React from 'react';
import { TR181Tree } from '../components/TR181Tree';

// PUBLIC_INTERFACE
export default function TR181Browser(): JSX.Element {
  /** Placeholder TR-181 Browser */
  return (
    <div className="panel">
      <h2>TR-181 Browser</h2>
      <TR181Tree />
    </div>
  );
}
