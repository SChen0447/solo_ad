import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { UserService } from '../modules/user/UserService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await UserService.login({ email, password });
          localStorage.setItem('token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await UserService.register({ username, email, password });
          localStorage.setItem('token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },

      fetchCurrentUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const user = await UserService.getCurrentUser();
          set({
            user,
            token,
            isAuthenticated: true
          });
        } catch {
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
