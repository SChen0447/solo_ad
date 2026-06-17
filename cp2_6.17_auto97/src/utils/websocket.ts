export interface CardData {
  id: string;
  title: string;
  tags: string[];
  notes: string;
  categoryId: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  position: number;
}

export interface UserData {
  id: string;
  nickname: string;
}

export interface LogEntryData {
  id: string;
  user: string;
  action: string;
  target: string;
  targetName: string;
  categoryName?: string;
  timestamp: number;
}

export interface RoomStateData {
  roomId: string;
  cards: CardData[];
  categories: CategoryData[];
  users: UserData[];
  logs: LogEntryData[];
}

type WSRequestType =
  | 'join_room'
  | 'create_room'
  | 'leave_room'
  | 'add_card'
  | 'update_card'
  | 'move_card'
  | 'delete_card'
  | 'add_category'
  | 'update_category'
  | 'delete_category'
  | 'get_state'
  | 'ping';

type WSResponseType =
  | 'room_created'
  | 'room_joined'
  | 'room_state'
  | 'card_added'
  | 'card_updated'
  | 'card_moved'
  | 'card_deleted'
  | 'category_added'
  | 'category_updated'
  | 'category_deleted'
  | 'users_updated'
  | 'log_added'
  | 'error'
  | 'pong';

interface WSRequestMessage {
  type: WSRequestType;
  payload?: any;
  requestId?: string;
}

interface WSResponseMessage {
  type: WSResponseType;
  payload?: any;
  requestId?: string;
  timestamp: number;
}

type MessageHandler = (message: WSResponseMessage) => void;

type EventType =
  | 'room_created'
  | 'room_joined'
  | 'room_state'
  | 'users_updated'
  | 'log_added'
  | 'error'
  | 'connected'
  | 'disconnected'
  | 'reconnecting';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string = '';
  private roomId: string | null = null;
  private reconnectInterval: number = 3000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = false;
  private manualClose: boolean = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private eventListeners: Map<EventType, Set<Function>> = new Map();
  private requestCallbacks: Map<string, (response: WSResponseMessage) => void> = new Map();
  private requestCounter: number = 0;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolver: (() => void) | null = null;

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  private emit(event: EventType, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  on(event: EventType, callback: Function): Function {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  off(event: EventType, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  connect(roomId?: string): Promise<void> {
    this.manualClose = false;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 3001;
    this.url = `${protocol}//${host}:${port}/ws`;

    if (roomId) {
      this.roomId = roomId.toUpperCase();
    }

    return this.establishConnection();
  }

  private establishConnection(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.connectionPromise || Promise.resolve();
    }

    this.connectionPromise = new Promise<void>((resolve) => {
      this.connectionResolver = resolve;

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        this.scheduleReconnect();
        resolve();
        return;
      }

      this.ws!.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.connectionResolver?.();
      };

      this.ws!.onmessage = (event) => {
        try {
          const message: WSResponseMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      this.ws!.onerror = (event) => {
        console.error('[WS] Error:', event);
      };

      this.ws!.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`);
        this.emit('disconnected');
        this.ws = null;

        if (!this.manualClose && this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    });

    return this.connectionPromise;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 3);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });

    setTimeout(() => {
      if (this.shouldReconnect && !this.manualClose) {
        this.establishConnection();
      }
    }, delay);
  }

  private handleMessage(message: WSResponseMessage): void {
    if (message.requestId) {
      const callback = this.requestCallbacks.get(message.requestId);
      if (callback) {
        callback(message);
        this.requestCallbacks.delete(message.requestId);
      }
    }

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    switch (message.type) {
      case 'room_created':
        this.roomId = message.payload?.roomId || null;
        this.emit('room_created', message.payload);
        break;
      case 'room_joined':
        this.roomId = message.payload?.roomId || null;
        this.emit('room_joined', message.payload);
        break;
      case 'room_state':
        this.emit('room_state', message.payload as RoomStateData);
        break;
      case 'users_updated':
        this.emit('users_updated', message.payload?.users as UserData[]);
        break;
      case 'log_added':
        this.emit('log_added', message.payload?.log as LogEntryData);
        break;
      case 'error':
        this.emit('error', message.payload);
        break;
    }
  }

  send(type: WSRequestType, payload?: any, timeout: number = 5000): Promise<any> {
    const requestId = this.generateRequestId();
    const message: WSRequestMessage = {
      type,
      payload,
      requestId,
    };

    return new Promise((resolve, reject) => {
      const doSend = () => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket is not connected'));
          return;
        }

        const timer = setTimeout(() => {
          this.requestCallbacks.delete(requestId);
          reject(new Error(`Request timeout: ${type}`));
        }, timeout);

        this.requestCallbacks.set(requestId, (response) => {
          clearTimeout(timer);
          if (response.type === 'error') {
            reject(new Error(response.payload?.message || 'Unknown error'));
          } else {
            resolve(response.payload);
          }
        });

        try {
          this.ws.send(JSON.stringify(message));
        } catch (err) {
          clearTimeout(timer);
          this.requestCallbacks.delete(requestId);
          reject(err);
        }
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        doSend();
      } else {
        this.establishConnection().then(doSend).catch(reject);
      }
    });
  }

  onMessage(type: WSResponseType, handler: MessageHandler): Function {
    this.messageHandlers.set(type, handler);
    return () => {
      this.messageHandlers.delete(type);
    };
  }

  async createRoom(nickname: string): Promise<{ roomId: string; userId: string; nickname: string }> {
    return this.send('create_room', { nickname });
  }

  async joinRoom(roomId: string, nickname: string): Promise<{ roomId: string; userId: string; nickname: string }> {
    return this.send('join_room', { roomId: roomId.toUpperCase(), nickname });
  }

  leaveRoom(): void {
    this.send('leave_room').catch(() => {});
  }

  async getState(): Promise<RoomStateData> {
    return this.send('get_state');
  }

  addCard(categoryId: string): Promise<any> {
    return this.send('add_card', { categoryId });
  }

  updateCard(cardId: string, updates: Partial<Omit<CardData, 'id' | 'createdAt' | 'createdBy'>>): Promise<any> {
    return this.send('update_card', { cardId, updates });
  }

  moveCard(cardId: string, newCategoryId: string, newPosition: number): Promise<any> {
    return this.send('move_card', { cardId, newCategoryId, newPosition });
  }

  deleteCard(cardId: string): Promise<any> {
    return this.send('delete_card', { cardId });
  }

  addCategory(name: string): Promise<any> {
    return this.send('add_category', { name });
  }

  updateCategory(categoryId: string, name: string): Promise<any> {
    return this.send('update_category', { categoryId, name });
  }

  deleteCategory(categoryId: string): Promise<any> {
    return this.send('delete_category', { categoryId });
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.manualClose = true;
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketManager = new WebSocketManager();
export default websocketManager;
