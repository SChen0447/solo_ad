import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  reminderEnabled: boolean;
}

interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

interface Plan {
  id: string;
  userId: string;
  goalName: string;
  goalDescription: string;
  dailyHours: number;
  duration: number;
  tasks: Task[];
  createdAt: string;
  progress: number;
}

interface AppState {
  user: User | null;
  token: string | null;
  plans: Plan[];
  currentPlan: Plan | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchPlans: () => Promise<void>;
  createPlan: (data: { goalName: string; goalDescription: string; dailyHours: number; duration: number }) => Promise<Plan | null>;
  fetchPlan: (id: string) => Promise<void>;
  toggleTask: (taskId: string, completed: boolean) => Promise<number>;
  updateUser: (data: { nickname?: string; avatar?: string; reminderEnabled?: boolean }) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  plans: [],
  currentPlan: null,

  login: async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      set({ user: data.user, token: data.token });
      return true;
    } catch {
      return false;
    }
  },

  register: async (username, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      set({ user: data.user, token: data.token });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    set({ user: null, token: null, plans: [], currentPlan: null });
  },

  fetchPlans: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const res = await fetch(`/api/plans?userId=${token}`);
      if (res.ok) {
        const data = await res.json();
        set({ plans: data });
      }
    } catch {}
  },

  createPlan: async (data) => {
    const token = get().token;
    if (!token) return null;
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: token }),
      });
      if (!res.ok) return null;
      const plan = await res.json();
      set((state) => ({ plans: [...state.plans, plan] }));
      return plan;
    } catch {
      return null;
    }
  },

  fetchPlan: async (id) => {
    try {
      const res = await fetch(`/api/plans/${id}`);
      if (res.ok) {
        const data = await res.json();
        set({ currentPlan: data });
      }
    } catch {}
  },

  toggleTask: async (taskId, completed) => {
    try {
      const res = await fetch(`/task-api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (res.ok) {
        const data = await res.json();
        const currentPlan = get().currentPlan;
        if (currentPlan) {
          set({
            currentPlan: {
              ...currentPlan,
              progress: data.progress,
              tasks: currentPlan.tasks.map((t) =>
                t.id === taskId ? { ...t, completed } : t
              ),
            },
          });
        }
        return data.progress;
      }
      return 0;
    } catch {
      return 0;
    }
  },

  updateUser: async (data) => {
    const token = get().token;
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        set({ user: updated });
      }
    } catch {}
  },
}));

export type { User, Task, Plan };
