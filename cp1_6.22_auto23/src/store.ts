import { create } from 'zustand';
import type { Room, Resident, Reading, Bill, TrendData } from './types';
import { fetchRooms, fetchResidents, fetchReadings, fetchBills } from './utils/api';

interface AppState {
  rooms: Room[];
  currentRoomId: string | null;
  residents: Resident[];
  readings: Reading[];
  bills: Bill[];
  currentBill: Bill | null;
  trendData: TrendData | null;
  sidebarOpen: boolean;

  setRooms: (rooms: Room[]) => void;
  setCurrentRoomId: (id: string | null) => void;
  setResidents: (residents: Resident[]) => void;
  setReadings: (readings: Reading[]) => void;
  setBills: (bills: Bill[]) => void;
  setCurrentBill: (bill: Bill | null) => void;
  setTrendData: (data: TrendData | null) => void;
  toggleSidebar: () => void;

  loadInitialData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  residents: [],
  readings: [],
  bills: [],
  currentBill: null,
  trendData: null,
  sidebarOpen: true,

  setRooms: (rooms) => set({ rooms }),
  setCurrentRoomId: (id) => set({ currentRoomId: id }),
  setResidents: (residents) => set({ residents }),
  setReadings: (readings) => set({ readings }),
  setBills: (bills) => set({ bills }),
  setCurrentBill: (bill) => set({ currentBill: bill }),
  setTrendData: (data) => set({ trendData: data }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  loadInitialData: async () => {
    const rooms = await fetchRooms();
    set({ rooms });

    const firstRoomId = rooms.length > 0 ? rooms[0].id : null;
    if (!firstRoomId) return;

    set({ currentRoomId: firstRoomId });

    const [residents, readings, bills] = await Promise.all([
      fetchResidents(firstRoomId),
      fetchReadings(firstRoomId),
      fetchBills(),
    ]);

    set({ residents, readings, bills });
  },
}));
