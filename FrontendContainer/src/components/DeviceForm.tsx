import React, { useState } from 'react';

// PUBLIC_INTERFACE
export function DeviceForm(): JSX.Element {
  /** Placeholder device add form (no real submission). */
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: integrate with API later
    alert(`Would add device: ${name} (${ip})`);
    setName('');
    setIp('');
  };

  return (
    <form onSubmit={submit} className="row" style={{ gap: 8 }}>
      <input placeholder="Device name" value={name} onChange={e => setName(e.target.value)} required />
      <input placeholder="IP address" value={ip} onChange={e => setIp(e.target.value)} required />
      <button className="primary" type="submit">Add</button>
    </form>
  );
}
