import type { BoardElement, SyncMessage, User } from '../types';
import { useBoardStore } from '../store/useBoardStore';

type MessageHandler = (message: SyncMessage) => void;

class SyncManager {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private connected: boolean = false;
  private mockDelay: number = 500;

  connect(_roomId: string = 'default'): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        this.emit('connected', {
          type: 'init',
          payload: null,
          userId: 'system',
          timestamp: Date.now(),
        });
        resolve();
      }, 100);
    });
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  sendAdd(element: BoardElement): void {
    if (!this.connected) return;
    const state = useBoardStore.getState();
    const message: SyncMessage = {
      type: 'add',
      payload: element,
      userId: state.currentUserId,
      timestamp: Date.now(),
    };
    this.simulateRemoteBroadcast(message);
  }

  sendUpdate(id: string, updates: Partial<BoardElement>): void {
    if (!this.connected) return;
    const state = useBoardStore.getState();
    const message: SyncMessage = {
      type: 'update',
      payload: { id, updates },
      userId: state.currentUserId,
      timestamp: Date.now(),
    };
    this.simulateRemoteBroadcast(message);
  }

  sendDelete(id: string): void {
    if (!this.connected) return;
    const state = useBoardStore.getState();
    const message: SyncMessage = {
      type: 'delete',
      payload: { id },
      userId: state.currentUserId,
      timestamp: Date.now(),
    };
    this.simulateRemoteBroadcast(message);
  }

  sendUserJoin(user: User): void {
    if (!this.connected) return;
    const message: SyncMessage = {
      type: 'user-join',
      payload: user,
      userId: user.id,
      timestamp: Date.now(),
    };
    this.simulateRemoteBroadcast(message);
  }

  private simulateRemoteBroadcast(message: SyncMessage): void {
    setTimeout(() => {
      if (message.type === 'add') {
        const element = message.payload as BoardElement;
        const state = useBoardStore.getState();
        if (element.userId !== state.currentUserId) {
          state.syncRemoteAdd(element);
        }
      } else if (message.type === 'update') {
        const { id, updates } = message.payload as { id: string; updates: Partial<BoardElement> };
        const state = useBoardStore.getState();
        if (message.userId !== state.currentUserId) {
          state.syncRemoteUpdate(id, updates);
        }
      } else if (message.type === 'delete') {
        const { id } = message.payload as { id: string };
        const state = useBoardStore.getState();
        if (message.userId !== state.currentUserId) {
          state.syncRemoteDelete(id);
        }
      }
    }, this.mockDelay);
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  private emit(event: string, message: SyncMessage): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => handler(message));
  }
}

export const syncManager = new SyncManager();
