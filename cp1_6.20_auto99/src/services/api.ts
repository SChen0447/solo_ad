import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { User, Plan, Item, Expense, Settlement } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<User>('/auth/register', data).then(res => res.data),
  
  login: (data: { email: string; password: string }) =>
    api.post<User>('/auth/login', data).then(res => res.data),
  
  logout: () =>
    api.post('/auth/logout').then(res => res.data),
  
  getMe: () =>
    api.get<User>('/auth/me').then(res => res.data)
};

export const planApi = {
  getPlans: () =>
    api.get<Plan[]>('/plans').then(res => res.data),
  
  getPlan: (planId: number) =>
    api.get<Plan>(`/plans/${planId}`).then(res => res.data),
  
  createPlan: (data: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    total_budget?: number;
  }) =>
    api.post<Plan>('/plans', data).then(res => res.data),
  
  updatePlan: (planId: number, data: Partial<Plan>) =>
    api.put<Plan>(`/plans/${planId}`, data).then(res => res.data),
  
  addMember: (planId: number, email: string) =>
    api.post<Plan>(`/plans/${planId}/members`, { email }).then(res => res.data)
};

export const itemApi = {
  createItem: (planId: number, data: {
    type: Item['type'];
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    cost?: number;
    responsible_id?: number | null;
  }) =>
    api.post<Item>(`/plans/${planId}/items`, data).then(res => res.data),
  
  updateItem: (planId: number, itemId: number, data: Partial<Item>) =>
    api.put<Item>(`/plans/${planId}/items/${itemId}`, data).then(res => res.data),
  
  deleteItem: (planId: number, itemId: number) =>
    api.delete(`/plans/${planId}/items/${itemId}`).then(res => res.data),
  
  reorderItems: (planId: number, items: { id: number; order: number }[]) =>
    api.post(`/plans/${planId}/items/reorder`, { items }).then(res => res.data)
};

export const expenseApi = {
  createExpense: (planId: number, data: {
    title: string;
    amount: number;
    currency?: string;
    paid_by: number;
    split_type: 'equal' | 'custom';
    splits?: Record<string, number>;
  }) =>
    api.post<Expense>(`/plans/${planId}/expenses`, data).then(res => res.data),
  
  deleteExpense: (planId: number, expenseId: number) =>
    api.delete(`/plans/${planId}/expenses/${expenseId}`).then(res => res.data)
};

export const settlementApi = {
  createSettlements: (planId: number, settlements: {
    from_user_id: number;
    to_user_id: number;
    amount: number;
  }[]) =>
    api.post<Settlement[]>(`/plans/${planId}/settlements`, { settlements }).then(res => res.data),
  
  completeSettlement: (planId: number, settlementId: number) =>
    api.post<Settlement>(`/plans/${planId}/settlements/${settlementId}/complete`).then(res => res.data)
};

export const socketEvents = {
  joinPlan: (planId: number, userId: number) => {
    getSocket().emit('join_plan', { plan_id: planId, user_id: userId });
  },
  
  leavePlan: (planId: number, userId: number) => {
    getSocket().emit('leave_plan', { plan_id: planId, user_id: userId });
  },
  
  onPlanUpdated: (callback: (plan: Plan) => void) => {
    getSocket().on('plan_updated', callback);
  },
  
  onItemCreated: (callback: (item: Item) => void) => {
    getSocket().on('item_created', callback);
  },
  
  onItemUpdated: (callback: (item: Item) => void) => {
    getSocket().on('item_updated', callback);
  },
  
  onItemDeleted: (callback: (data: { id: number }) => void) => {
    getSocket().on('item_deleted', callback);
  },
  
  onItemsReordered: (callback: (data: { items: { id: number; order: number }[] }) => void) => {
    getSocket().on('items_reordered', callback);
  },
  
  onExpenseCreated: (callback: (expense: Expense) => void) => {
    getSocket().on('expense_created', callback);
  },
  
  onExpenseDeleted: (callback: (data: { id: number }) => void) => {
    getSocket().on('expense_deleted', callback);
  },
  
  onSettlementsCreated: (callback: (data: { settlements: Settlement[] }) => void) => {
    getSocket().on('settlements_created', callback);
  },
  
  onSettlementCompleted: (callback: (settlement: Settlement) => void) => {
    getSocket().on('settlement_completed', callback);
  },
  
  onUserStatusChanged: (callback: (data: { user_id: number; online: boolean }) => void) => {
    getSocket().on('user_status_changed', callback);
  },
  
  offAll: () => {
    const s = getSocket();
    s.off('plan_updated');
    s.off('item_created');
    s.off('item_updated');
    s.off('item_deleted');
    s.off('items_reordered');
    s.off('expense_created');
    s.off('expense_deleted');
    s.off('settlements_created');
    s.off('settlement_completed');
    s.off('user_status_changed');
  }
};

export default api;
