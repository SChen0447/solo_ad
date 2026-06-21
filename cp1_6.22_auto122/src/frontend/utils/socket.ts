import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Map<string, (...args: any[]) => void>> = new Map();

  connect(): Socket {
    if (!this.socket) {
      this.socket = io('/', {
        transports: ['websocket', 'polling'],
      });
      this.socket.on('connect', () => {
        console.log('[Socket] Connected:', this.socket?.id);
      });
      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });
      this.socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err);
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, ...args: any[]): void {
    this.connect();
    this.socket?.emit(event, ...args);
  }

  on(event: string, listenerId: string, callback: (...args: any[]) => void): void {
    this.connect();
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }
    this.listeners.get(event)!.set(listenerId, callback);
    this.socket?.on(event, callback);
  }

  off(event: string, listenerId: string): void {
    const eventMap = this.listeners.get(event);
    if (eventMap) {
      const callback = eventMap.get(listenerId);
      if (callback) {
        this.socket?.off(event, callback);
        eventMap.delete(listenerId);
      }
    }
  }

  joinRoom(roomId: string): void {
    this.emit('joinRoom', roomId);
  }

  leaveRoom(roomId: string): void {
    this.emit('leaveRoom', roomId);
  }
}

export const socket = new SocketManager();
