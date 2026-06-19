export interface Plant {
  id: string;
  name: string;
  species: string;
  photoUrl: string;
  wateringFrequency: number;
  notes: string;
  createdAt: string;
  nextWateringDate: string;
}

export type LogType = 'water' | 'fertilize';

export interface Log {
  id: string;
  plantId: string;
  type: LogType;
  note: string;
  timestamp: string;
}

export interface LogsResponse {
  logs: Log[];
  total: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
