import { create } from 'zustand';
import { User, Badge } from './types';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  showBadgeModal: boolean;
  newBadges: Badge[];
  setUser: (user: User | null) => void;
  logout: () => void;
  showBadges: (badges: Badge[]) => void;
  hideBadgeModal: () => void;
  updateUserHours: (totalHours: number, authLevel: number, badges: number[]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  showBadgeModal: false,
  newBadges: [],
  setUser: (user) => {
    if (user) {
      localStorage.setItem('userId', user.id);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, isLoggedIn: !!user });
  },
  logout: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    set({ user: null, isLoggedIn: false });
  },
  showBadges: (badges) => set({ showBadgeModal: true, newBadges: badges }),
  hideBadgeModal: () => set({ showBadgeModal: false, newBadges: [] }),
  updateUserHours: (totalHours, authLevel, badges) =>
    set((state) => ({
      user: state.user ? { ...state.user, totalHours, authLevel, badges } : null,
    })),
}));

const savedUser = localStorage.getItem('user');
if (savedUser) {
  try {
    const user = JSON.parse(savedUser);
    useAuthStore.getState().setUser(user);
  } catch (e) {
    console.error('Failed to parse saved user');
  }
}
