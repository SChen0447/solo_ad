import { create } from 'zustand';
import type { User } from '@/types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user: User) => set({ currentUser: user }),
  toast: null,
  showToast: (message: string, type: 'success' | 'error' = 'success') =>
    set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
