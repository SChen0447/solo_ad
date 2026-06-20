import { create } from 'zustand';
import type { User, Item, Exchange, Notification } from '@/types';

interface AppState {
  currentUser: User | null;
  items: Item[];
  pendingExchanges: Exchange[];
  notifications: Notification[];
  setCurrentUser: (user: User) => void;
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  setPendingExchanges: (exchanges: Exchange[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  createdAt: string;
}

const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  items: [],
  pendingExchanges: [],
  notifications: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  setItems: (items) => set({ items }),

  addItem: (item) => set((state) => ({ items: [...state.items, item] })),

  updateItem: (updatedItem) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    })),

  setPendingExchanges: (exchanges) => set({ pendingExchanges: exchanges }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

export default useAppStore;
