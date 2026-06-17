import { io, Socket } from 'socket.io-client';
import type { DrawElement, DrawEvent, InitSyncMessage, UserInfo } from './types';

export interface CollaborationModuleOptions {
  roomId: string;
  userInfo: UserInfo;
  onRemoteDraw: (element: DrawElement) => void;
  onInitSync: (elements: DrawElement[]) => void;
  onUserJoined?: (user: UserInfo) => void;
  onUserLeft?: (userId: string) => void;
  onConnectionStatusChange?: (connected: boolean) => void;
}

export class CollaborationModule {
  private socket: Socket | null = null;
  private roomId: string;
  private userInfo: UserInfo;
  private onRemoteDraw: (element: DrawElement) => void;
  private onInitSync: (elements: DrawElement[]) => void;
  private onUserJoined?: (user: UserInfo) => void;
  private onUserLeft?: (userId: string) => void;
  private onConnectionStatusChange?: (connected: boolean) => void;
  private isConnected: boolean = false;

  constructor(options: CollaborationModuleOptions) {
    this.roomId = options.roomId;
    this.userInfo = options.userInfo;
    this.onRemoteDraw = options.onRemoteDraw;
    this.onInitSync = options.onInitSync;
    this.onUserJoined = options.onUserJoined;
    this.onUserLeft = options.onUserLeft;
    this.onConnectionStatusChange = options.onConnectionStatusChange;
  }

  public connect(): void {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.onConnectionStatusChange?.(true);
      this.joinRoom();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.onConnectionStatusChange?.(false);
    });

    this.socket.on('draw', (data: DrawEvent) => {
      if (data.userId !== this.userInfo.id) {
        this.onRemoteDraw(data.element);
      }
    });

    this.socket.on('init', (data: InitSyncMessage) => {
      this.onInitSync(data.elements);
    });

    this.socket.on('userJoined', (user: UserInfo) => {
      if (user.id !== this.userInfo.id) {
        this.onUserJoined?.(user);
      }
    });

    this.socket.on('userLeft', (userId: string) => {
      this.onUserLeft?.(userId);
    });

    this.socket.on('onlineUsers', (users: UserInfo[]) => {
      users.forEach(user => {
        if (user.id !== this.userInfo.id) {
          this.onUserJoined?.(user);
        }
      });
    });
  }

  private joinRoom(): void {
    if (!this.socket) return;
    this.socket.emit('joinRoom', {
      roomId: this.roomId,
      userInfo: this.userInfo
    });
  }

  public requestInitSync(): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('requestInitSync', { roomId: this.roomId });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.off('connect');
      this.socket.off('disconnect');
      this.socket.off('draw');
      this.socket.off('init');
      this.socket.off('userJoined');
      this.socket.off('userLeft');
      this.socket.off('onlineUsers');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public sendDrawEvent(element: DrawElement): void {
    if (!this.socket || !this.isConnected) return;

    const event: DrawEvent = {
      type: 'draw',
      element,
      roomId: this.roomId,
      userId: this.userInfo.id
    };

    this.socket.emit('draw', event);
  }

  public sendUpdateEvent(element: DrawElement): void {
    if (!this.socket || !this.isConnected) return;

    const event: DrawEvent = {
      type: 'update',
      element,
      roomId: this.roomId,
      userId: this.userInfo.id
    };

    this.socket.emit('draw', event);
  }

  public sendDeleteEvent(elementId: string): void {
    if (!this.socket || !this.isConnected) return;

    const event: DrawEvent = {
      type: 'delete',
      element: { id: elementId } as DrawElement,
      roomId: this.roomId,
      userId: this.userInfo.id
    };

    this.socket.emit('draw', event);
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}
