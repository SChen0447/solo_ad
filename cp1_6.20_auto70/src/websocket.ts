import { io, Socket } from 'socket.io-client';

class StockSocket {
  private static instance: StockSocket;
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  private constructor() {}

  static getInstance(): StockSocket {
    if (!StockSocket.instance) {
      StockSocket.instance = new StockSocket();
    }
    return StockSocket.instance;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io('ws://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('stock_update', (data: any) => {
      this.notify('stock_update', data);
    });

    this.socket.on('connected', (data: any) => {
      this.notify('connected', data);
    });

    this.socket.on('disconnect', () => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.socket?.disconnect();
      }
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onMessage(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  offMessage(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private notify(event: string, data: any): void {
    const start = performance.now();
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('Listener error:', e);
        }
      });
    }
    const latency = performance.now() - start;
    if (latency > 10) {
      console.warn(`WebSocket message processing took ${latency}ms`);
    }
  }

  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default StockSocket.getInstance();
