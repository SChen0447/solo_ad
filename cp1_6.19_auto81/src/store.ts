import { create } from 'zustand';
import type { Order, Product, SortItem, AppNotification, TodayStats } from './types';
import * as api from './api';

interface AppState {
  orders: Order[];
  products: Product[];
  sortList: SortItem[];
  notifications: AppNotification[];
  todayStats: TodayStats | null;
  unreadCount: number;
  loading: boolean;

  fetchOrders: (status?: string, keyword?: string) => Promise<void>;
  fetchTodayStats: () => Promise<void>;
  fetchProducts: (category?: string) => Promise<void>;
  fetchSortList: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  createProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateSortCheck: (productId: string, userName: string, checked: boolean) => Promise<void>;
  completeSort: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  orders: [],
  products: [],
  sortList: [],
  notifications: [],
  todayStats: null,
  unreadCount: 0,
  loading: false,

  fetchOrders: async (status?, keyword?) => {
    set({ loading: true });
    try {
      const orders = await api.fetchOrders(status, keyword);
      set({ orders });
    } finally {
      set({ loading: false });
    }
  },

  fetchTodayStats: async () => {
    set({ loading: true });
    try {
      const todayStats = await api.fetchTodayStats();
      set({ todayStats });
    } finally {
      set({ loading: false });
    }
  },

  fetchProducts: async (category?) => {
    set({ loading: true });
    try {
      const products = await api.fetchProducts(category);
      set({ products });
    } finally {
      set({ loading: false });
    }
  },

  fetchSortList: async () => {
    set({ loading: true });
    try {
      const sortList = await api.fetchSortList();
      set({ sortList });
    } finally {
      set({ loading: false });
    }
  },

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const notifications = await api.fetchNotifications();
      set({ notifications });
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await api.fetchUnreadCount();
      set({ unreadCount });
    } catch {
      // silent
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ loading: true });
    try {
      const updated = await api.updateOrderStatus(id, status);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updated : o)),
      }));
    } finally {
      set({ loading: false });
    }
  },

  createProduct: async (product) => {
    set({ loading: true });
    try {
      const created = await api.createProduct(product);
      set((state) => ({ products: [...state.products, created] }));
    } finally {
      set({ loading: false });
    }
  },

  updateProduct: async (id, product) => {
    set({ loading: true });
    try {
      const updated = await api.updateProduct(id, product);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
      }));
    } finally {
      set({ loading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true });
    try {
      await api.deleteProduct(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } finally {
      set({ loading: false });
    }
  },

  updateSortCheck: async (productId, userName, checked) => {
    await api.updateSortCheck(productId, userName, checked);
    set((state) => ({
      sortList: state.sortList.map((item) =>
        item.productId === productId
          ? {
              ...item,
              sources: item.sources.map((s) =>
                s.userName === userName ? { ...s, checked } : s
              ),
            }
          : item
      ),
    }));
  },

  completeSort: async () => {
    set({ loading: true });
    try {
      await api.completeSort();
      set({ sortList: [] });
    } finally {
      set({ loading: false });
    }
  },

  markNotificationRead: async (id) => {
    await api.markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
}));

export const useStore = useAppStore;
