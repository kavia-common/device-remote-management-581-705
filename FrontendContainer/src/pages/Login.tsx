import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /** Simple placeholder login form that stores a fake token in the state store. */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login('demo-token', { username });
    navigate('/dashboard');
  };

  return (
    <div className="panel" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Login</h2>
      <form className="column" onSubmit={onSubmit}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label htmlFor="username">Username</label>
          <input id="username" required value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" type="submit">Sign in</button>
        </div>
      </form>
    </div>
  );
}
