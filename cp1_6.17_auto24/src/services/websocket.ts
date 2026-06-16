import { io, Socket } from 'socket.io-client';
import { MindMapState } from '../types';

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();

  connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        query: { username },
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.onAny((event: string, ...args: any[]) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach((cb) => cb(args[0]));
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  getInitialState(): MindMapState {
    return { nodes: [], connections: [] };
  }

  sendNodeCreate(node: any): void {
    this.emit('node:create', node);
  }

  sendNodeUpdate(node: any): void {
    this.emit('node:update', node);
  }

  sendNodeDelete(nodeId: string): void {
    this.emit('node:delete', nodeId);
  }

  sendNodeMove(nodeId: string, x: number, y: number): void {
    this.emit('node:move', { nodeId, x, y });
  }

  sendConnectionCreate(fromNodeId: string, toNodeId: string): void {
    this.emit('connection:create', { fromNodeId, toNodeId });
  }

  sendConnectionDelete(connectionId: string): void {
    this.emit('connection:delete', connectionId);
  }

  sendRollback(historyId: string): void {
    this.emit('history:rollback', { historyId });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();
