import React from 'react';

// PUBLIC_INTERFACE
export function ProtocolSelectors(): JSX.Element {
  /** Placeholder for protocol config selectors. */
  return (
    <div className="row" style={{ gap: 8 }}>
      <select defaultValue="snmp-v2">
        <option value="snmp-v2">SNMP v2</option>
        <option value="snmp-v3">SNMP v3</option>
        <option value="webpa">WebPA</option>
        <option value="tr69">TR-069</option>
        <option value="usp">TR-369 (USP)</option>
      </select>
      <input placeholder="Community / Credentials" style={{ minWidth: 240 }} />
      <button className="primary">Save</button>
    </div>
  );
}
