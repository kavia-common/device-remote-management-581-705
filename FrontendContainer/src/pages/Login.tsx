import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /** Login form that authenticates against backend /auth/login endpoint. */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const login = useAuthStore(s => s.login);
  const selectTenant = useTenantStore(s => s.selectTenant);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call backend auth endpoint
      const response = await api().post('/auth/login', {
        email,
        password
      });

      const { access_token, user } = response.data;
      
      // Store token and user in auth store
      login(access_token, {
        id: user.id,
        username: user.email?.split('@')[0] || user.email,
        email: user.email,
        tenant_id: user.tenant_id
      });

      // Set tenant context if available
      if (user.tenant_id) {
        selectTenant(user.tenant_id);
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err?.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Login</h2>
      <form className="column" onSubmit={onSubmit}>
        {error && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '16px', 
            background: '#fee', 
            color: '#c33',
            borderRadius: '4px' 
          }}>
            {error}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <label htmlFor="email">Email</label>
          <input 
            id="email" 
            type="email"
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            disabled={loading}
          />
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
          <label htmlFor="password">Password</label>
          <input 
            id="password" 
            type="password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            disabled={loading}
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
      <div style={{ marginTop: '16px', fontSize: '0.9em', color: '#666' }}>
        <p><strong>Demo credentials:</strong></p>
        <p>Email: admin@example.com</p>
        <p>Password: (use default from seed data)</p>
      </div>
    </div>
  );
}
