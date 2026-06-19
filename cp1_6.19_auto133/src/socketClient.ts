import { io, Socket } from 'socket.io-client';
import { Stroke, StickyNoteData, User, Point, TrailPoint } from './types';

class SocketClient {
  private socket: Socket | null = null;
  private userId: string = '';
  private userName: string = '';
  private userColor: string = '';
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  connect(): Promise<{ userId: string; userName: string; userColor: string; canvasState: { strokes: Stroke[]; notes: StickyNoteData[] }; users: User[] }> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          console.log('WebSocket已连接');
        });

        this.socket.on('init', (data: {
          userId: string;
          userName: string;
          userColor: string;
          canvasState: { strokes: Stroke[]; notes: StickyNoteData[] };
          users: User[];
        }) => {
          this.userId = data.userId;
          this.userName = data.userName;
          this.userColor = data.userColor;
          resolve(data);
        });

        this.socket.on('connect_error', (err) => {
          console.error('连接错误:', err);
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket已断开');
        });

        const events = [
          'user-joined',
          'user-left',
          'stroke-start',
          'stroke-continue',
          'stroke-end',
          'stroke-undo',
          'note-create',
          'note-update',
          'note-move',
          'note-move-end',
          'note-delete',
          'cursor-move',
          'trail-update',
          'canvas-restored'
        ];

        events.forEach(event => {
          this.socket?.on(event, (...args: unknown[]) => {
            this.emit(event, ...args);
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private emit(event: string, ...args: unknown[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
    }
  }

  getUserId(): string { return this.userId; }
  getUserName(): string { return this.userName; }
  getUserColor(): string { return this.userColor; }

  strokeStart(stroke: Stroke) {
    this.socket?.emit('stroke-start', { stroke });
  }

  strokeContinue(strokeId: string, points: Point[]) {
    this.socket?.emit('stroke-continue', { strokeId, points });
  }

  strokeEnd(strokeId: string) {
    this.socket?.emit('stroke-end', { strokeId });
  }

  strokeUndo(strokeId: string) {
    this.socket?.emit('stroke-undo', { strokeId });
  }

  noteCreate(note: StickyNoteData) {
    this.socket?.emit('note-create', { note });
  }

  noteUpdate(note: StickyNoteData) {
    this.socket?.emit('note-update', { note });
  }

  noteMove(noteId: string, x: number, y: number) {
    this.socket?.emit('note-move', { noteId, x, y });
  }

  noteMoveEnd(noteId: string, x: number, y: number) {
    this.socket?.emit('note-move-end', { noteId, x, y });
  }

  noteDelete(noteId: string) {
    this.socket?.emit('note-delete', { noteId });
  }

  cursorMove(x: number, y: number) {
    this.socket?.emit('cursor-move', { x, y });
  }

  trailUpdate(elementId: string, trail: TrailPoint[]) {
    this.socket?.emit('trail-update', { elementId, trail });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketClient = new SocketClient();
