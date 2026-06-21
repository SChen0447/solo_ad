import { create } from 'zustand';
import { v4 } from 'uuid';
import type { ToastMessage } from '@shared/types';

interface AppState {
  user: { id: number; username: string } | null;
  toasts: ToastMessage[];
  isLoggedIn: boolean;
  userId: number | null;
  login: (user: { id: number; username: string }) => void;
  logout: () => void;
  setUser: (user: { id: number; username: string }) => void;
  toast: (message: string, type: ToastMessage['type']) => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  toasts: [],
  isLoggedIn: false,
  userId: null,

  login: (user) => set({ user, isLoggedIn: true, userId: user.id }),

  logout: () => set({ user: null, isLoggedIn: false, userId: null }),

  setUser: (user) => set({ user, isLoggedIn: true, userId: user.id }),

  toast: (message, type) => {
    const id = v4();
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  addToast: (type, message) => {
    const id = v4();
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const useStore = useAppStore;
