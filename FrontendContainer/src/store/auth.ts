import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  tenant_id?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  // PUBLIC_INTERFACE
  login: (token: string, user: User) => void;
  // PUBLIC_INTERFACE
  logout: () => void;
  // PUBLIC_INTERFACE
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      // PUBLIC_INTERFACE
      login: (token: string, user: User) => {
        set({ token, user });
        // Store token in localStorage for SSE connections
        localStorage.setItem('auth_token', token);
      },
      // PUBLIC_INTERFACE
      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('auth_token');
      },
      // PUBLIC_INTERFACE
      updateUser: (user: User) => set({ user })
    }),
    {
      name: 'auth-storage'
    }
  )
);
