import { io, Socket } from 'socket.io-client';
import type { IdeaCardData } from '../types';

const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:5000';

type WSHandler = (...args: any[]) => void;

class WSClient {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<WSHandler>> = new Map();
  private reconnectAttempts = 0;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(WS_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (err) => {
          if (this.reconnectAttempts === 0) {
            reject(err);
          }
          this.reconnectAttempts++;
        });

        this.socket.onAny((event, ...args) => {
          const set = this.handlers.get(event);
          if (set) {
            set.forEach((h) => {
              try { h(...args); } catch (e) { console.error(e); }
            });
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  get connected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  on(event: string, handler: WSHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.warn('[WS] Not connected, cannot emit:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  joinSession(sessionId: string, userId: string): void {
    this.emit('join_session', { sessionId: sessionId.toUpperCase(), userId });
  }

  updateStatus(sessionId: string, userId: string, status: 'editing' | 'browsing'): void {
    this.emit('update_status', { sessionId: sessionId.toUpperCase(), userId, status });
  }

  createCard(sessionId: string, userId: string, card: Partial<IdeaCardData> & { x: number; y: number }): void {
    this.emit('create_card', {
      sessionId: sessionId.toUpperCase(),
      userId,
      cardId: card.id,
      content: card.content || '',
      color: card.color,
      x: card.x,
      y: card.y,
    });
  }

  updateCard(sessionId: string, cardId: string, updates: { content?: string; color?: string | null }): void {
    this.emit('update_card', {
      sessionId: sessionId.toUpperCase(),
      cardId,
      ...updates,
    });
  }

  moveCard(sessionId: string, cardId: string, x: number, y: number, zIndex: number): void {
    this.emit('move_card', {
      sessionId: sessionId.toUpperCase(),
      cardId,
      x,
      y,
      zIndex,
    });
  }

  deleteCard(sessionId: string, userId: string, cardId: string): void {
    this.emit('delete_card', {
      sessionId: sessionId.toUpperCase(),
      userId,
      cardId,
    });
  }

  addVote(sessionId: string, userId: string, cardId: string): void {
    this.emit('add_vote', {
      sessionId: sessionId.toUpperCase(),
      userId,
      cardId,
    });
  }

  removeVote(sessionId: string, userId: string, cardId: string): void {
    this.emit('remove_vote', {
      sessionId: sessionId.toUpperCase(),
      userId,
      cardId,
    });
  }

  startVoting(sessionId: string, userId: string): void {
    this.emit('start_voting', {
      sessionId: sessionId.toUpperCase(),
      userId,
    });
  }

  resetToBrainstorm(sessionId: string, userId: string): void {
    this.emit('reset_to_brainstorm', {
      sessionId: sessionId.toUpperCase(),
      userId,
    });
  }
}

export const wsClient = new WSClient();
