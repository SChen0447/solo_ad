import { io, Socket } from 'socket.io-client';
import { MindMapData, UserCursor, OperationNotification } from '@typeDefs/index';

class SocketService {
  private socket: Socket | null = null;
  private token: string = '';
  private roomId: string = '';

  connect(token: string, roomId: string): Socket {
    this.token = token;
    this.roomId = roomId;

    this.socket = io({
      query: { token, roomId },
      transports: ['websocket', 'polling'],
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  onConnect(callback: () => void) {
    this.socket?.on('connect', callback);
  }

  onDisconnect(callback: () => void) {
    this.socket?.on('disconnect', callback);
  }

  onMindMapUpdate(callback: (data: MindMapData) => void) {
    this.socket?.on('mindmap_update', callback);
  }

  onCursorUpdate(callback: (cursors: UserCursor[]) => void) {
    this.socket?.on('cursors_update', callback);
  }

  onOperation(callback: (notification: OperationNotification) => void) {
    this.socket?.on('operation', callback);
  }

  onUserJoined(callback: (user: any) => void) {
    this.socket?.on('user_joined', callback);
  }

  onUserLeft(callback: (userId: string) => void) {
    this.socket?.on('user_left', callback);
  }

  sendCursorPosition(x: number, y: number) {
    this.socket?.emit('cursor_move', { x, y });
  }

  sendMindMapUpdate(data: MindMapData, operationType: string, nodeId: string) {
    this.socket?.emit('mindmap_update', { data, operationType, nodeId });
  }

  offAll() {
    if (this.socket) {
      this.socket.off('connect');
      this.socket.off('disconnect');
      this.socket.off('mindmap_update');
      this.socket.off('cursors_update');
      this.socket.off('operation');
      this.socket.off('user_joined');
      this.socket.off('user_left');
    }
  }
}

export default new SocketService();
