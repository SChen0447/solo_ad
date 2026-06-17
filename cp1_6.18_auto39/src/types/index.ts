export type DeviceStatus = 'idle' | 'in-use' | 'maintenance';

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  remainingMinutes: number;
  currentUser?: string;
  maintenanceReason?: string;
  totalDuration?: number;
  startTime?: number;
}

export interface QueueItem {
  id: string;
  nickname: string;
  duration: number;
  estimatedStartTime: number;
  socketId?: string;
}

export interface OnlineUser {
  socketId: string;
  nickname?: string;
  isAdmin: boolean;
}

export interface DeviceWithQueue extends Device {
  queue: QueueItem[];
}
