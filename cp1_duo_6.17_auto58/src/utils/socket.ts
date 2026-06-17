import { io, Socket } from 'socket.io-client';

export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  votes: number;
  addedBy: string;
}

export interface NowPlaying {
  song: Song;
  currentTime: number;
  startedAt: number;
}

export interface PlaylistState {
  nowPlaying: NowPlaying;
  queue: Song[];
  onlineUsers: number;
  totalSongs: number;
}

type PlaylistUpdateCallback = (state: PlaylistState) => void;
type SongAddedCallback = (song: Song) => void;
type UserJoinCallback = (data: { onlineUsers: number }) => void;

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('playlist:update', (state: PlaylistState) => {
      this.emit('playlist:update', state);
    });

    this.socket.on('song:added', (song: Song) => {
      this.emit('song:added', song);
    });

    this.socket.on('user:join', (data: { onlineUsers: number }) => {
      this.emit('user:join', data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  vote(songId: string): void {
    this.socket?.emit('song:vote', { songId });
  }

  onPlaylistUpdate(callback: PlaylistUpdateCallback): () => void {
    return this.addListener('playlist:update', callback);
  }

  onSongAdded(callback: SongAddedCallback): () => void {
    return this.addListener('song:added', callback);
  }

  onUserJoin(callback: UserJoinCallback): () => void {
    return this.addListener('user:join', callback);
  }

  private addListener(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      callback(data);
    });
  }
}

export const socketManager = new SocketManager();
