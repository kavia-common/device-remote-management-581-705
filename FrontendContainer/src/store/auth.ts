import { create } from 'zustand';

export interface User {
  username: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  // PUBLIC_INTERFACE
  login: (token: string, user: User) => void;
  // PUBLIC_INTERFACE
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  // PUBLIC_INTERFACE
  login: (token: string, user: User) => set({ token, user }),
  // PUBLIC_INTERFACE
  logout: () => set({ token: null, user: null })
}));
