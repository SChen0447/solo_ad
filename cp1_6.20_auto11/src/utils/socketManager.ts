import { io, Socket } from 'socket.io-client';
import type { User, CursorPosition, Comment, Reply, Proposal, Snapshot, CodeFile } from '../types';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(roomId: string, user: User): void {
    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.emit('join-room', { roomId, user });
    });

    this.socket.onAny((event, ...args) => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.forEach((handler) => handler(...args));
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on<T = any>(event: string, handler: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      setTimeout(() => this.emit(event, data), 100);
    }
  }

  joinRoom(roomId: string, user: User): void {
    this.emit('join-room', { roomId, user });
  }

  leaveRoom(roomId: string, userId: string): void {
    this.emit('leave-room', { roomId, userId });
  }

  sendCursorPosition(roomId: string, cursor: CursorPosition): void {
    this.emit('cursor-update', { roomId, cursor });
  }

  sendCodeChange(roomId: string, fileName: string, content: string, language: string): void {
    this.emit('code-change', { roomId, fileName, content, language });
  }

  switchFile(roomId: string, fileName: string, userId: string): void {
    this.emit('switch-file', { roomId, fileName, userId });
  }

  addComment(roomId: string, comment: Omit<Comment, 'id' | 'createdAt'>): void {
    this.emit('comment-add', { roomId, comment });
  }

  resolveComment(roomId: string, commentId: string, user: User): void {
    this.emit('comment-resolve', { roomId, commentId, user });
  }

  addReply(roomId: string, commentId: string, reply: Omit<Reply, 'id' | 'createdAt'>): void {
    this.emit('comment-reply', { roomId, commentId, reply });
  }

  createProposal(roomId: string, proposal: Omit<Proposal, 'id' | 'createdAt' | 'status' | 'likes' | 'rejections'>): void {
    this.emit('proposal-create', { roomId, proposal });
  }

  likeProposal(roomId: string, proposalId: string, userId: string): void {
    this.emit('proposal-like', { roomId, proposalId, userId });
  }

  rejectProposal(roomId: string, proposalId: string, userId: string): void {
    this.emit('proposal-reject', { roomId, proposalId, userId });
  }

  approveProposal(roomId: string, proposalId: string): void {
    this.emit('proposal-approve', { roomId, proposalId });
  }

  sendSnapshot(roomId: string, snapshot: Snapshot): void {
    this.emit('snapshot-save', { roomId, snapshot });
  }

  restoreSnapshot(roomId: string, snapshotIndex: number): void {
    this.emit('snapshot-restore', { roomId, snapshotIndex });
  }

  addFile(roomId: string, file: CodeFile): void {
    this.emit('file-add', { roomId, file });
  }
}

export const socketManager = new SocketManager();
export default socketManager;
