import { create } from 'zustand';
import axios from 'axios';

export interface Member {
  id: string;
  bandId: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Sheet {
  id: string;
  eventId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  annotation: string;
  url: string;
  version: number;
}

export interface RehearsalEvent {
  id: string;
  bandId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  confirmedMembers: string[];
  confirmedMemberDetails: Member[];
  sheets: Sheet[];
  createdAt: string;
}

export interface Band {
  id: string;
  name: string;
  adminEmail: string;
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string;
  };
  members: Member[];
  createdAt: string;
}

export interface MemberStat {
  memberId: string;
  memberName: string;
  totalHours: number;
  attendanceCount: number;
  attendanceRate: number;
}

export interface BandStats {
  totalRehearsals: number;
  averageAttendanceRate: number;
  memberStats: MemberStat[];
}

interface AppState {
  currentUser: Member | null;
  bands: Band[];
  currentBandId: string | null;
  events: RehearsalEvent[];
  stats: BandStats | null;
  loading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  setCurrentUser: (user: Member | null) => void;
  setCurrentBandId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  fetchBands: () => Promise<void>;
  fetchEvents: (bandId: string, month: string) => Promise<void>;
  fetchStats: (bandId: string, month?: string) => Promise<void>;
  confirmAttendance: (eventId: string, memberId: string, confirmed: boolean) => Promise<void>;
  createBand: (data: { name: string; adminEmail: string; schedule: Band['schedule'] }) => Promise<Band>;
  addMember: (bandId: string, email: string, name: string) => Promise<void>;
  updateEventLocation: (eventId: string, location: string) => Promise<void>;
  uploadSheet: (eventId: string, file: File, annotation: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  bands: [],
  currentBandId: null,
  events: [],
  stats: null,
  loading: false,
  error: null,
  sidebarOpen: true,

  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentBandId: (id) => set({ currentBandId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  fetchBands: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/bands');
      set({ bands: res.data });
      if (res.data.length > 0 && !get().currentBandId) {
        set({ currentBandId: res.data[0].id });
        const firstBand = res.data[0];
        const adminMember = firstBand.members.find((m: Member) => m.role === 'admin');
        if (adminMember) set({ currentUser: adminMember });
      }
    } catch (err) {
      set({ error: '获取乐队列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchEvents: async (bandId, month) => {
    const cacheKey = `calendar_${bandId}_${month}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        set({ events: data });
        return;
      }
    }
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`/api/bands/${bandId}/events?month=${month}`);
      set({ events: res.data });
      localStorage.setItem(cacheKey, JSON.stringify({ data: res.data, timestamp: Date.now() }));
    } catch (err) {
      set({ error: '获取排练事件失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async (bandId, month) => {
    set({ loading: true, error: null });
    try {
      const url = month
        ? `/api/bands/${bandId}/stats?month=${month}`
        : `/api/bands/${bandId}/stats`;
      const res = await axios.get(url);
      set({ stats: res.data });
    } catch (err) {
      set({ error: '获取统计数据失败' });
    } finally {
      set({ loading: false });
    }
  },

  confirmAttendance: async (eventId, memberId, confirmed) => {
    try {
      await axios.put(`/api/events/${eventId}/confirm`, { memberId, confirmed });
      const { currentBandId, events } = get();
      const updatedEvents = events.map(e => {
        if (e.id === eventId) {
          const newConfirmed = confirmed
            ? [...e.confirmedMembers, memberId]
            : e.confirmedMembers.filter(id => id !== memberId);
          const members = get().bands.find(b => b.id === currentBandId)?.members || [];
          return {
            ...e,
            confirmedMembers: newConfirmed,
            confirmedMemberDetails: members.filter(m => newConfirmed.includes(m.id)),
          };
        }
        return e;
      });
      set({ events: updatedEvents });
    } catch (err) {
      set({ error: '确认状态更新失败' });
    }
  },

  createBand: async (data) => {
    const res = await axios.post('/api/bands', data);
    set(state => ({ bands: [...state.bands, res.data] }));
    return res.data;
  },

  addMember: async (bandId, email, name) => {
    const res = await axios.post(`/api/bands/${bandId}/members`, { email, name });
    set(state => ({
      bands: state.bands.map(b => b.id === bandId ? { ...b, members: [...b.members, res.data] } : b),
    }));
  },

  updateEventLocation: async (eventId, location) => {
    await axios.put(`/api/events/${eventId}`, { location });
    set(state => ({
      events: state.events.map(e => e.id === eventId ? { ...e, location } : e),
    }));
  },

  uploadSheet: async (eventId, file, annotation) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('annotation', annotation);
    const res = await axios.post(`/api/events/${eventId}/sheets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    set(state => ({
      events: state.events.map(e => e.id === eventId ? { ...e, sheets: [...e.sheets, res.data] } : e),
    }));
  },
}));
