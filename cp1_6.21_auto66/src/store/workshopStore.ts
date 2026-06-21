import { create } from "zustand";

export interface MaterialKit {
  id: string;
  name: string;
  price: number;
  stock: number;
  required: boolean;
}

export interface Workshop {
  id: string;
  name: string;
  coverImage: string;
  description: string;
  datetime: string;
  maxParticipants: number;
  currentParticipants: number;
  fee: number;
  materialKits: MaterialKit[];
  createdAt: string;
}

export interface ParticipantInfo {
  name: string;
  contact: string;
}

export interface MaterialKitOrder {
  kitId: string;
  quantity: number;
}

export interface Registration {
  id: string;
  workshopId: string;
  participants: ParticipantInfo[];
  materialKitOrders: MaterialKitOrder[];
  confirmationCode: string;
  totalFee: number;
  createdAt: string;
}

interface WorkshopState {
  workshops: Workshop[];
  currentWorkshop: Workshop | null;
  registration: Registration | null;
  history: (Registration & { workshop: Workshop })[];
  loading: boolean;
  error: string | null;
  fetchWorkshops: () => Promise<void>;
  fetchWorkshopById: (id: string) => Promise<void>;
  registerForWorkshop: (
    workshopId: string,
    data: {
      participantCount: number;
      materialKitOrders: MaterialKitOrder[];
      participants: ParticipantInfo[];
    }
  ) => Promise<string | null>;
  fetchHistory: (contact: string) => Promise<void>;
  createWorkshop: (data: FormData) => Promise<void>;
  fetchConfirmation: (code: string) => Promise<void>;
}

export const useWorkshopStore = create<WorkshopState>((set) => ({
  workshops: [],
  currentWorkshop: null,
  registration: null,
  history: [],
  loading: false,
  error: null,

  fetchWorkshops: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/workshops");
      if (!res.ok) throw new Error("获取工作坊列表失败");
      const workshops: Workshop[] = await res.json();
      set({ workshops, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchWorkshopById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/workshops/${id}`);
      if (!res.ok) throw new Error("获取工作坊详情失败");
      const currentWorkshop: Workshop = await res.json();
      set({ currentWorkshop, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  registerForWorkshop: async (workshopId, data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/workshops/${workshopId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "报名失败");
      }
      set({ loading: false });
      return result.confirmationCode || null;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      return null;
    }
  },

  fetchHistory: async (contact: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/history?contact=${encodeURIComponent(contact)}`);
      if (!res.ok) throw new Error("获取历史记录失败");
      const history: (Registration & { workshop: Workshop })[] = await res.json();
      set({ history, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createWorkshop: async (data: FormData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/workshops", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("创建工作坊失败");
      const workshop: Workshop = await res.json();
      set((state) => ({
        workshops: [...state.workshops, workshop],
        loading: false,
      }));
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchConfirmation: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/registrations/${code}`);
      if (!res.ok) throw new Error("获取报名信息失败");
      const registration: Registration & { workshop: Workshop } = await res.json();
      set({ registration, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
