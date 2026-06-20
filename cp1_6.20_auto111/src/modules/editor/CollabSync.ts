import type { EditOperation, CollaboratorCursor, User, Snippet } from './types';

type OperationCallback = (op: EditOperation) => void;
type CursorCallback = (cursors: CollaboratorCursor[]) => void;
type CollaboratorsCallback = (users: User[]) => void;

class CollabSync {
  private socket: WebSocket | null = null;
  private connected = false;
  private roomId: string | null = null;
  private user: User | null = null;
  private onOperation: OperationCallback | null = null;
  private onCursorUpdate: CursorCallback | null = null;
  private onCollaboratorsChange: CollaboratorsCallback | null = null;
  private useMock = true;
  private mockCursors: CollaboratorCursor[] = [];
  private mockInterval: number | null = null;

  connect(roomId: string, user: User): void {
    this.roomId = roomId;
    this.user = user;

    if (this.useMock) {
      this.connected = true;
      this.startMockCollaboration();
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      this.socket.onopen = () => {
        this.connected = true;
        this.sendEvent('join-room', { snippetId: roomId, user });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          // ignore parse errors
        }
      };

      this.socket.onclose = () => {
        this.connected = false;
      };
    } catch {
      this.connected = false;
    }
  }

  private startMockCollaboration(): void {
    if (!this.user || !this.roomId) return;

    const mockUsers: User[] = [
      { id: 'mock-user-1', name: 'Alex', avatarColor: '#e74c3c' },
      { id: 'mock-user-2', name: 'Sam', avatarColor: '#2ecc71' },
    ];

    this.mockCursors = mockUsers.map((u, i) => ({
      userId: u.id,
      user: u,
      position: 50 + i * 20,
      color: ['#ff6b6b', '#4ecdc4', '#45b7d1'][i],
    }));

    if (this.onCursorUpdate) {
      this.onCursorUpdate(this.mockCursors);
    }

    if (this.onCollaboratorsChange) {
      this.onCollaboratorsChange(mockUsers);
    }

    this.mockInterval = window.setInterval(() => {
      this.mockCursors = this.mockCursors.map(c => ({
        ...c,
        position: Math.max(0, c.position + Math.floor(Math.random() * 11) - 5),
      }));
      if (this.onCursorUpdate) {
        this.onCursorUpdate(this.mockCursors);
      }
    }, 2000);
  }

  private handleMessage(data: { type: string; payload: unknown }): void {
    switch (data.type) {
      case 'edit-operation':
        if (this.onOperation && data.payload) {
          this.onOperation(data.payload as EditOperation);
        }
        break;
      case 'cursor-update':
        if (this.onCursorUpdate && data.payload) {
          this.onCursorUpdate(data.payload as CollaboratorCursor[]);
        }
        break;
      case 'collaborators':
        if (this.onCollaboratorsChange && data.payload) {
          this.onCollaboratorsChange(data.payload as User[]);
        }
        break;
    }
  }

  private sendEvent(type: string, payload: unknown): void {
    if (this.socket && this.connected) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  sendOperation(operation: EditOperation): void {
    if (this.useMock) return;
    this.sendEvent('edit-operation', operation);
  }

  sendCursorUpdate(cursor: CollaboratorCursor): void {
    if (this.useMock) return;
    this.sendEvent('cursor-update', cursor);
  }

  setOperationCallback(callback: OperationCallback): void {
    this.onOperation = callback;
  }

  setCursorCallback(callback: CursorCallback): void {
    this.onCursorUpdate = callback;
  }

  setCollaboratorsCallback(callback: CollaboratorsCallback): void {
    this.onCollaboratorsChange = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    this.mockCursors = [];

    if (this.socket) {
      if (this.roomId && this.user) {
        this.sendEvent('leave-room', { snippetId: this.roomId, userId: this.user.id });
      }
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this.roomId = null;
    this.user = null;
  }
}

export const collabSync = new CollabSync();

export function applyOperation(code: string, op: EditOperation): string {
  switch (op.type) {
    case 'insert':
      return code.slice(0, op.position) + (op.text || '') + code.slice(op.position);
    case 'delete':
      return code.slice(0, op.position) + code.slice(op.position + (op.length || 0));
    case 'replace':
      return code.slice(0, op.position) + (op.text || '') + code.slice(op.position + (op.length || 0));
    default:
      return code;
  }
}
