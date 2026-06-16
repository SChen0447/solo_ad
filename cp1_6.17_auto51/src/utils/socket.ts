import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    return this.socket;
  }

  joinVote(voteId: string): void {
    const socket = this.connect();
    socket.emit('join_vote', { voteId });
  }

  leaveVote(voteId: string): void {
    if (this.socket) {
      this.socket.emit('leave_vote', { voteId });
    }
  }

  onVoteUpdated(callback: (data: { voteId: string; vote: any }) => void): () => void {
    const socket = this.connect();
    const handler = (data: { voteId: string; vote: any }) => callback(data);
    socket.on('vote_updated', handler);
    return () => socket.off('vote_updated', handler);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
export default socketManager;
