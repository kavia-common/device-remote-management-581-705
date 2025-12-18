import { create } from 'zustand';
import type { ToastType } from '../components/ui/Toast';

interface ToastStore {
  toasts: ToastType[];
  addToast: (message: string, type: ToastType['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// PUBLIC_INTERFACE
export const useToastStore = create<ToastStore>((set) => ({
  /** Toast notification state management store. */
  toasts: [],
  
  addToast: (message: string, type: ToastType['type'], duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },
  
  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  clearToasts: () => {
    set({ toasts: [] });
  },
}));
