import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface Room {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  facilities: string[];
  status: 'free' | 'partial' | 'busy';
  currentBooking?: {
    title: string;
    endTime: string;
  };
}

export interface Booking {
  id: string;
  room_id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: number;
  notes: string;
}

export interface Device {
  id: string;
  name: string;
  type: 'projector' | 'microphone' | 'whiteboard';
  room_id: string;
  room_name: string;
  model: string;
  status: 'normal' | 'warning' | 'fault';
  last_maintenance: string;
  fault_records: { date: string; count: number }[];
  is_on?: boolean;
  volume?: number;
}

export interface BookingForm {
  room_id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: number;
  notes: string;
}

export interface DeviceControl {
  device_id: string;
  action: 'turn_on' | 'turn_off' | 'volume_up' | 'volume_down';
}

export const getRooms = () => api.get<Room[]>('/rooms');

export const createBooking = (data: BookingForm) => api.post<Booking>('/bookings', data);

export const cancelBooking = (id: string) => api.delete(`/bookings/${id}`);

export const getDevices = () => api.get<Device[]>('/devices');

export const controlDevice = (data: DeviceControl) => api.post(`/devices/${data.device_id}/control`, data);

let socket: Socket | null = null;

export const initDeviceWebSocket = (onUpdate: (device: Device) => void): Socket => {
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('device_update', (device: Device) => {
    onUpdate(device);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default api;
