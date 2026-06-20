import { io, Socket } from 'socket.io-client';
import type { RunResult } from '../types';

export interface WebSocketCallbacks {
  onResult: (result: RunResult) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onRankingUpdate?: (data: any) => void;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private callbacks: WebSocketCallbacks;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connected: boolean = false;

  constructor(url: string, callbacks: WebSocketCallbacks) {
    this.url = url;
    this.callbacks = callbacks;
  }

  connect(): void {
    try {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.callbacks.onConnect?.();
        this.startHeartbeat();
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.callbacks.onDisconnect?.();
        this.stopHeartbeat();
      });

      this.socket.on('connect_error', (error: Error) => {
        this.callbacks.onError?.(error);
      });

      this.socket.on('run_result', (result: RunResult) => {
        this.callbacks.onResult(result);
      });

      this.socket.on('submit_result', (result: RunResult) => {
        this.callbacks.onResult(result);
      });

      this.socket.on('ranking_update', (data: any) => {
        this.callbacks.onRankingUpdate?.(data);
      });

      this.socket.on('pong', () => {
      });
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.socket !== null;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendRunCode(code: string, problemId: number, userId: string, username: string): void {
    if (!this.socket || !this.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('run_code', {
      code,
      problemId,
      userId,
      username,
    });
  }

  sendSubmitCode(code: string, problemId: number, userId: string, username: string): void {
    if (!this.socket || !this.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('submit_code', {
      code,
      problemId,
      userId,
      username,
    });
  }
}

export default WebSocketClient;
