import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// PUBLIC_INTERFACE
export const useAuthStore = create(
  persist(
    (set) => ({
      /**
       * Authentication store managing user state, tokens, and auth status
       */
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },
      
      setAccessToken: (accessToken) => {
        set({ accessToken });
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
