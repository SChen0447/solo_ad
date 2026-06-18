export interface User {
  id: string;
  nickname: string;
  avatarColor: string;
  isSpeaking?: boolean;
  isCreator?: boolean;
}

export type VoteType = 'approve' | 'stars' | 'priority';

export interface Vote {
  id: string;
  type: VoteType;
  noteId: string;
  votes: Record<string, number>;
  createdAt: number;
  endedAt?: number;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  creatorId: string;
  createdAt: number;
  vote?: Vote;
}

export interface Room {
  id: string;
  code: string;
  topic: string;
  duration: number;
  createdAt: number;
  creatorId: string;
  users: User[];
  notes: StickyNote[];
  voteEnded?: boolean;
}

export interface CreateRoomRequest {
  topic: string;
  duration?: number;
  nickname: string;
}

export interface JoinRoomRequest {
  code: string;
  nickname: string;
}

export interface ServerToClientEvents {
  'user:joined': (user: User) => void;
  'user:left': (userId: string) => void;
  'user:speaking': (userId: string) => void;
  'note:created': (note: StickyNote) => void;
  'note:updated': (note: StickyNote) => void;
  'note:deleted': (noteId: string) => void;
  'vote:cast': (vote: Vote) => void;
  'vote:ended': () => void;
  'room:state': (room: Room) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string; user: User }) => void;
  'room:leave': (roomId: string) => void;
  'note:create': (data: { roomId: string; note: StickyNote }) => void;
  'note:update': (data: { roomId: string; note: StickyNote }) => void;
  'note:delete': (data: { roomId: string; noteId: string }) => void;
  'vote:cast': (data: { roomId: string; vote: Vote }) => void;
  'vote:end': (roomId: string) => void;
  'user:speaking': (data: { roomId: string; userId: string }) => void;
}
