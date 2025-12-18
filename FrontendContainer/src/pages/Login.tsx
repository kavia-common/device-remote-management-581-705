import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToastStore } from '../store/toast';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /** Login form with client-side validation and enhanced UX. */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const login = useAuthStore(s => s.login);
  const selectTenant = useTenantStore(s => s.selectTenant);
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const response = await api().post('/auth/login', {
        email: email.trim(),
        password
      });

      const { access_token, user } = response.data;
      
      login(access_token, {
        id: user.id,
        username: user.email?.split('@')[0] || user.email,
        email: user.email,
        tenant_id: user.tenant_id
      });

      if (user.tenant_id) {
        selectTenant(user.tenant_id);
      }

      addToast('Login successful!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err?.response?.data?.detail || 'Login failed. Please check your credentials.';
      addToast(message, 'error');
      setErrors({ password: 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Welcome Back</h1>
          <p className="text-muted">Sign in to Device Remote Management</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setErrors(prev => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            placeholder="admin@example.com"
            required
            disabled={loading}
            autoComplete="email"
          />
          
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setErrors(prev => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            placeholder="Enter your password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={loading}
            disabled={loading}
          >
            Sign in
          </Button>
        </form>
        
        <div className="mt-6 p-4 bg-bg rounded-lg border border-border">
          <p className="text-xs text-muted mb-2 font-semibold">Demo Credentials:</p>
          <p className="text-xs text-muted">Email: admin@example.com</p>
          <p className="text-xs text-muted">Password: (use default from seed data)</p>
        </div>
      </div>
    </div>
  );
}
