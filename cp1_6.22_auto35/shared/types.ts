export interface Device {
  id: number;
  name: string;
  icon: string;
  status: 'available' | 'in_use';
}

export interface Booking {
  id: number;
  deviceId: number;
  userId: number;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface BookingWithDevice extends Booking {
  deviceName: string;
  deviceIcon: string;
}

export interface User {
  id: number;
  username: string;
  password: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: { id: number; username: string };
  error?: string;
}

export interface BookingResponse {
  success: boolean;
  booking?: BookingWithDevice;
  error?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  message: string;
}
