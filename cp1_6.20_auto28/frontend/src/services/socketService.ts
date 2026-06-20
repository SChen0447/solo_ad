import { io, Socket } from 'socket.io-client';
import type { Vote } from '../types';

type EventCallback = (data: Vote) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private connected = false;

  connect(): void {
    if (this.connected && this.socket) {
      return;
    }

    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[Socket] Connected');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[Socket] Disconnected');
    });

    this.socket.on('submit', (data: Vote) => {
      this.emit('submit', data);
    });

    this.socket.on('update', (data: Vote) => {
      this.emit('update', data);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  joinRoom(roomId: string): void {
    if (this.socket && this.connected) {
      this.socket.emit('join', roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket && this.connected) {
      this.socket.emit('leave', roomId);
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: Vote): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in ${event} listener:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const socketService = new SocketService();
export default socketService;
