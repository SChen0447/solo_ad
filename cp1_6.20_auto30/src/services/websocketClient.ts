import { io, Socket } from 'socket.io-client';

export interface NoteData {
  id: string;
  pitch: number;
  duration: number;
  position: number;
  measure: number;
  voice: number;
}

export interface EditEvent {
  type: 'add' | 'delete' | 'move';
  note: NoteData;
  oldNote?: NoteData;
  timestamp: number;
  userId: string;
  userName: string;
  measure: number;
}

export interface RoomSettings {
  timeSignature: string;
  keySignature: string;
  tempo: number;
}

export interface ChordData {
  root: string;
  type: string;
  notes: number[];
  measure: number;
  beat: number;
}

export interface UserCursor {
  userId: string;
  userName: string;
  position: number;
  measure: number;
  color: string;
}

type EventCallback = (data: unknown) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userId: string = '';
  private userName: string = '';
  private currentRoom: string = '';

  connect(userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userId = userId;
      this.userName = userName;

      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect after maximum attempts'));
          }
          console.error('WebSocket connection error:', error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected:', reason);
        });

        this.registerSocketEvents();
      } catch (error) {
        reject(error);
      }
    });
  }

  private registerSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('note:added', (data: EditEvent) => {
      this.emit('note:added', data);
    });

    this.socket.on('note:deleted', (data: EditEvent) => {
      this.emit('note:deleted', data);
    });

    this.socket.on('note:moved', (data: EditEvent) => {
      this.emit('note:moved', data);
    });

    this.socket.on('cursor:update', (data: UserCursor) => {
      this.emit('cursor:update', data);
    });

    this.socket.on('room:settings', (data: RoomSettings) => {
      this.emit('room:settings', data);
    });

    this.socket.on('room:joined', (data: { roomId: string; notes: NoteData[]; settings: RoomSettings; users: Array<{ id: string; name: string }> }) => {
      this.currentRoom = data.roomId;
      this.emit('room:joined', data);
    });

    this.socket.on('user:joined', (data: { id: string; name: string }) => {
      this.emit('user:joined', data);
    });

    this.socket.on('user:left', (data: { id: string; name: string }) => {
      this.emit('user:left', data);
    });

    this.socket.on('conflict:detected', (data: { measure: number; message: string }) => {
      this.emit('conflict:detected', data);
    });

    this.socket.on('harmony:generated', (data: { chords: ChordData[] }) => {
      this.emit('harmony:generated', data);
    });
  }

  joinRoom(roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('room:join', {
      roomId,
      userId: this.userId,
      userName: this.userName,
    });
  }

  createRoom(roomId?: string): string {
    const id = roomId || this.generateRoomId();
    if (this.socket) {
      this.socket.emit('room:create', {
        roomId: id,
        userId: this.userId,
        userName: this.userName,
      });
    }
    this.currentRoom = id;
    return id;
  }

  leaveRoom(): void {
    if (!this.socket || !this.currentRoom) return;
    this.socket.emit('room:leave', {
      roomId: this.currentRoom,
      userId: this.userId,
    });
    this.currentRoom = '';
  }

  sendEditEvent(event: Omit<EditEvent, 'userId' | 'userName' | 'timestamp'>): void {
    if (!this.socket) return;
    const fullEvent: EditEvent = {
      ...event,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now(),
    };
    this.socket.emit('note:edit', fullEvent);
  }

  updateCursor(position: number, measure: number): void {
    if (!this.socket) return;
    this.socket.emit('cursor:update', {
      userId: this.userId,
      userName: this.userName,
      position,
      measure,
      color: this.getUserColor(),
    });
  }

  updateSettings(settings: RoomSettings): void {
    if (!this.socket) return;
    this.socket.emit('room:settings:update', {
      roomId: this.currentRoom,
      settings,
    });
  }

  generateHarmony(startMeasure: number, measures: NoteData[][]): void {
    if (!this.socket) return;
    this.socket.emit('harmony:generate', {
      roomId: this.currentRoom,
      startMeasure,
      measures,
    });
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

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private getUserColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#6c5ce7', '#fd79a8', '#00b894'];
    const index = parseInt(this.userId, 36) % colors.length;
    return colors[index] || '#ff6b6b';
  }

  getCurrentRoom(): string {
    return this.currentRoom;
  }

  getUserId(): string {
    return this.userId;
  }

  getUserName(): string {
    return this.userName;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }
}

export const websocketClient = new WebSocketClient();
