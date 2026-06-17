import { create } from 'zustand';
import type { Device, QueueItem, DeviceStatus } from '../types';

interface Notification {
  id: string;
  deviceId: string;
  deviceName: string;
  message: string;
}

interface AppState {
  devices: Device[];
  queues: Record<string, QueueItem[]>;
  onlineCount: number;
  currentUser: {
    nickname: string;
    isAdmin: boolean;
    socketId?: string;
  };
  notifications: Notification[];
  setDevices: (devices: Device[]) => void;
  updateDeviceStatus: (deviceId: string, status: DeviceStatus, remainingMinutes?: number, currentUser?: string, maintenanceReason?: string) => void;
  setQueue: (deviceId: string, queue: QueueItem[]) => void;
  setOnlineCount: (count: number) => void;
  setCurrentUser: (user: { nickname: string; isAdmin: boolean; socketId?: string }) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  devices: [],
  queues: {},
  onlineCount: 0,
  currentUser: {
    nickname: '',
    isAdmin: false,
  },
  notifications: [],
  setDevices: (devices) => set({ devices }),
  updateDeviceStatus: (deviceId, status, remainingMinutes, currentUser, maintenanceReason) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId
          ? { ...d, status, remainingMinutes: remainingMinutes ?? d.remainingMinutes, currentUser, maintenanceReason }
          : d
      ),
    })),
  setQueue: (deviceId, queue) =>
    set((state) => ({
      queues: { ...state.queues, [deviceId]: queue },
    })),
  setOnlineCount: (count) => set({ onlineCount: count }),
  setCurrentUser: (user) => set({ currentUser: user }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
