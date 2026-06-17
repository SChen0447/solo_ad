import { io, Socket } from 'socket.io-client';
import type { ActivityStats } from '../types';

type StatsCallback = (stats: ActivityStats) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private callbacks: Set<StatsCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect() {
    if (this.socket?.connected) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws.stats`;

    this.socket = io(url, {
      path: '/ws.stats',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('stats_update', (stats: ActivityStats) => {
      this.callbacks.forEach((cb) => cb(stats));
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnect attempts reached');
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onStatsUpdate(callback: StatsCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsClient = new WebSocketClient();
