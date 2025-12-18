import React, { useState } from 'react';

// PUBLIC_INTERFACE
export function QueryForm(): JSX.Element {
  /** Placeholder query form for protocol operations. */
  const [protocol, setProtocol] = useState('SNMPv2');
  const [query, setQuery] = useState('1.3.6.1.2.1.1.1.0');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Would run ${protocol} query: ${query}`);
  };

  return (
    <form className="row" onSubmit={submit}>
      <select value={protocol} onChange={e => setProtocol(e.target.value)}>
        <option>SNMPv2</option>
        <option>SNMPv3</option>
        <option>WebPA</option>
        <option>TR69</option>
        <option>USP (TR369)</option>
      </select>
      <input style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} />
      <button className="primary" type="submit">Run</button>
    </form>
  );
}
