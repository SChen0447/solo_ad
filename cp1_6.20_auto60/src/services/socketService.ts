import { io, Socket } from 'socket.io-client';
import { Idea, Member } from './apiService';

export type SocketEventHandler<T = unknown> = (data: T) => void;

interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  new_idea: (idea: Idea) => void;
  new_vote: (idea: Idea) => void;
  member_joined: (member: Member) => void;
  member_left: (memberId: string) => void;
  members_list: (members: Member[]) => void;
  vote_ended: (report: DecisionReport) => void;
}

export interface DecisionReport {
  rankings: Array<{
    ideaId: string;
    content: string;
    avgScore: number;
    feasibilityAvg: number;
    innovationAvg: number;
    costAvg: number;
    rank: number;
  }>;
  participantCount: number;
  votedCount: number;
  totalIdeas: number;
}

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<SocketEventHandler>> = new Map();

  connect(member: Member): void {
    this.socket = io({
      transports: ['websocket', 'polling'],
      query: {
        memberId: member.id,
        memberName: member.name,
        memberColor: member.color,
      },
    });

    this.socket.on('connect', () => {
      this.emit('connect');
    });

    this.socket.on('disconnect', () => {
      this.emit('disconnect');
    });

    this.socket.on('new_idea', (idea: Idea) => {
      this.emit('new_idea', idea);
    });

    this.socket.on('new_vote', (idea: Idea) => {
      this.emit('new_vote', idea);
    });

    this.socket.on('member_joined', (member: Member) => {
      this.emit('member_joined', member);
    });

    this.socket.on('member_left', (memberId: string) => {
      this.emit('member_left', memberId);
    });

    this.socket.on('members_list', (members: Member[]) => {
      this.emit('members_list', members);
    });

    this.socket.on('vote_ended', (report: DecisionReport) => {
      this.emit('vote_ended', report);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  sendNewIdea(idea: Idea): void {
    if (this.socket?.connected) {
      this.socket.emit('new_idea', idea);
    }
  }

  sendNewVote(idea: Idea): void {
    if (this.socket?.connected) {
      this.socket.emit('new_vote', idea);
    }
  }

  endVote(): void {
    if (this.socket?.connected) {
      this.socket.emit('end_vote');
    }
  }

  requestSync(): void {
    if (this.socket?.connected) {
      this.socket.emit('request_sync');
    }
  }

  on<K extends keyof SocketEvents>(
    event: K,
    handler: SocketEventHandler<Parameters<SocketEvents[K]>[0]>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as SocketEventHandler);

    return () => {
      this.eventListeners.get(event)?.delete(handler as SocketEventHandler);
    };
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error('Socket event handler error:', err);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
