import { create } from 'zustand';

interface AppState {
  isLoggedIn: boolean;
  username: string;
  toast: { show: boolean; message: string; type: 'success' | 'error' } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoggedIn: false,
  username: '',
  toast: null,
  login: (username, password) => {
    if (username === 'admin' && password === 'admin123') {
      set({ isLoggedIn: true, username });
      return true;
    }
    return false;
  },
  logout: () => {
    set({ isLoggedIn: false, username: '' });
  },
  showToast: (message, type = 'success') => {
    set({ toast: { show: true, message, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 3000);
  },
  hideToast: () => {
    set({ toast: null });
  },
}));
