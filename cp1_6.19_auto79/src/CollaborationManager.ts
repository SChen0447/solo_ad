import { io, Socket } from 'socket.io-client';
import { EditOperation, CollaboratorInfo } from './types';

type OperationHandler = (operation: EditOperation, user: CollaboratorInfo) => void;
type UserJoinHandler = (user: CollaboratorInfo) => void;
type UserLeaveHandler = (userId: string) => void;

class CollaborationManager {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private userId: string = '';
  private userName: string = '';
  private onOperation: OperationHandler | null = null;
  private onUserJoin: UserJoinHandler | null = null;
  private onUserLeave: UserLeaveHandler | null = null;
  private collaborators: Map<string, CollaboratorInfo> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    this.userId = this.generateUserId();
    this.userName = `User_${this.userId.slice(0, 4)}`;
  }

  private generateUserId(): string {
    return 'u_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  connect(projectId: string): void {
    this.projectId = projectId;

    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 500,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.socket?.emit('join-project', {
        projectId,
        userId: this.userId,
        userName: this.userName,
      });
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
    });

    this.socket.on('user-joined', (data: { user: CollaboratorInfo }) => {
      this.collaborators.set(data.user.id, data.user);
      if (this.onUserJoin) this.onUserJoin(data.user);
    });

    this.socket.on('user-left', (data: { userId: string }) => {
      this.collaborators.delete(data.userId);
      if (this.onUserLeave) this.onUserLeave(data.userId);
    });

    this.socket.on('remote-operation', (data: { operation: EditOperation; user: CollaboratorInfo }) => {
      if (data.user.id !== this.userId && this.onOperation) {
        this.onOperation(data.operation, data.user);
      }
    });

    this.socket.on('project-users', (users: CollaboratorInfo[]) => {
      users.forEach((u) => this.collaborators.set(u.id, u));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('leave-project', {
        projectId: this.projectId,
        userId: this.userId,
      });
      this.socket.disconnect();
      this.socket = null;
    }
    this.collaborators.clear();
  }

  sendOperation(operation: EditOperation): void {
    if (!this.socket?.connected) return;
    this.socket.emit('edit-operation', {
      projectId: this.projectId,
      operation,
      userId: this.userId,
    });
  }

  getUserId(): string {
    return this.userId;
  }

  getUserName(): string {
    return this.userName;
  }

  getCollaborators(): CollaboratorInfo[] {
    return Array.from(this.collaborators.values());
  }

  setUserName(name: string): void {
    this.userName = name;
  }

  onRemoteOperation(handler: OperationHandler): void {
    this.onOperation = handler;
  }

  onUserJoined(handler: UserJoinHandler): void {
    this.onUserJoin = handler;
  }

  onUserLeft(handler: UserLeaveHandler): void {
    this.onUserLeave = handler;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default CollaborationManager;
