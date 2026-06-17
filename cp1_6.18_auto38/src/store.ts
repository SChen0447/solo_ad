import { create } from 'zustand';
import { Medicine, Reminder, Member, ReminderStatus, Stats } from './types';
import { medicinesApi, remindersApi, membersApi, statsApi } from './api';

interface AppState {
  medicines: Medicine[];
  reminders: Reminder[];
  members: Member[];
  stats: Stats;
  loading: boolean;
  error: string | null;
  currentUserId: string;

  fetchMedicines: () => Promise<void>;
  fetchReminders: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAll: () => Promise<void>;

  addMedicine: (data: Partial<Medicine> & { createdBy: string }) => Promise<Medicine>;
  updateMedicine: (id: string, data: Partial<Medicine>) => Promise<Medicine>;
  deleteMedicine: (id: string) => Promise<void>;

  addReminder: (data: Partial<Reminder>) => Promise<Reminder>;
  updateReminderStatus: (id: string, status: ReminderStatus) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  checkExpiry: () => Promise<void>;

  addMember: (name: string) => Promise<Member>;
  deleteMember: (id: string) => Promise<void>;

  setCurrentUser: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  medicines: [],
  reminders: [],
  members: [],
  stats: {
    medicinesCount: 0,
    pendingRemindersCount: 0,
    expiredCount: 0,
  },
  loading: false,
  error: null,
  currentUserId: '',

  fetchMedicines: async () => {
    try {
      set({ loading: true });
      const data = await medicinesApi.getAll();
      set({ medicines: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchReminders: async () => {
    try {
      set({ loading: true });
      const data = await remindersApi.getAll();
      const pendingCount = data.filter(r => r.status === 'pending').length;
      const expiredCount = data.filter(r => r.severity === 'expired' && r.status === 'pending').length;
      set({
        reminders: data,
        stats: { ...get().stats, pendingRemindersCount: pendingCount, expiredCount },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchMembers: async () => {
    try {
      set({ loading: true });
      const data = await membersApi.getAll();
      const owner = data.find(m => m.isOwner);
      set({
        members: data,
        currentUserId: get().currentUserId || owner?.id || data[0]?.id || '',
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const { medicines, reminders } = get();
      const medicinesCount = medicines.length;
      const pendingRemindersCount = reminders.filter(r => r.status === 'pending').length;
      const expiredCount = medicines.filter(m => {
        const expiry = new Date(m.expiryDate);
        return expiry < new Date();
      }).length;
      set({
        stats: { medicinesCount, pendingRemindersCount, expiredCount },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    try {
      await Promise.all([
        get().fetchMembers(),
        get().fetchMedicines(),
        get().fetchReminders(),
      ]);
      get().fetchStats();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addMedicine: async (data) => {
    try {
      const newMed = await medicinesApi.create(data);
      set(state => ({
        medicines: [newMed, ...state.medicines],
      }));
      get().fetchStats();
      return newMed;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateMedicine: async (id, data) => {
    try {
      const updated = await medicinesApi.update(id, data);
      set(state => ({
        medicines: state.medicines.map(m => m.id === id ? updated : m),
      }));
      get().fetchStats();
      return updated;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteMedicine: async (id) => {
    try {
      await medicinesApi.delete(id);
      set(state => ({
        medicines: state.medicines.filter(m => m.id !== id),
      }));
      get().fetchStats();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addReminder: async (data) => {
    try {
      const newReminder = await remindersApi.create(data);
      set(state => ({
        reminders: [newReminder, ...state.reminders],
      }));
      get().fetchStats();
      return newReminder;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateReminderStatus: async (id, status) => {
    try {
      await remindersApi.updateStatus(id, status);
      set(state => ({
        reminders: state.reminders.map(r =>
          r.id === id ? { ...r, status } : r
        ),
      }));
      get().fetchStats();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteReminder: async (id) => {
    try {
      await remindersApi.delete(id);
      set(state => ({
        reminders: state.reminders.filter(r => r.id !== id),
      }));
      get().fetchStats();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  checkExpiry: async () => {
    try {
      const result = await remindersApi.checkExpiry();
      set(state => {
        const existingIds = new Set(state.reminders.map(r => r.id));
        const newReminders = result.reminders.filter(r => !existingIds.has(r.id));
        return {
          reminders: [...newReminders, ...state.reminders],
          stats: {
            ...state.stats,
            pendingRemindersCount: result.totalPending,
            expiredCount: result.expiredCount,
          },
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addMember: async (name) => {
    try {
      const newMember = await membersApi.create(name);
      set(state => ({
        members: [...state.members, newMember],
      }));
      return newMember;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteMember: async (id) => {
    try {
      await membersApi.delete(id);
      set(state => ({
        members: state.members.filter(m => m.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setCurrentUser: (id) => set({ currentUserId: id }),
}));
