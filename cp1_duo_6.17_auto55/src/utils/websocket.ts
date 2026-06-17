import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private docId: string | null = null;
  private userId: string | null = null;

  connect(docId: string, userId: string): void {
    if (this.socket && this.docId === docId && this.userId === userId) {
      return;
    }

    this.disconnect();
    this.docId = docId;
    this.userId = userId;
    this.reconnectAttempts = 0;

    this.establishConnection();
  }

  private establishConnection(): void {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: false
    });

    socket.on('connect', () => {
      this.reconnectAttempts = 0;
      socket.emit('join_document', {
        docId: this.docId,
        userId: this.userId
      });
    });

    socket.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    socket.on('connect_error', () => {
      this.attemptReconnect();
    });

    socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });

    socket.on('content_update', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    socket.on('cursor_update', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    socket.on('user_join', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    socket.on('user_leave', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    socket.on('version_save', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    socket.on('conflict', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    socket.on('document_sync', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    this.socket = socket;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.emit('connection_lost', null);
      return;
    }

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach((callback) => callback(message.payload));
    }
  }

  send(type: WebSocketMessage['type'], payload: Record<string, unknown>): void {
    if (!this.socket || !this.socket.connected || !this.docId || !this.userId) {
      return;
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      userId: this.userId,
      docId: this.docId
    };

    this.socket.emit('message', message);
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.docId = null;
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}

export const wsManager = new WebSocketManager();
