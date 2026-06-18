import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  pitch: number;
  start: number;
  duration: number;
  trackId: string;
}

export interface Track {
  id: string;
  name: string;
  type: 'piano' | 'strings' | 'drums';
  notes: Note[];
}

export interface ScoreState {
  tracks: Track[];
  bpm: number;
  quantize: number;
  currentTrackId: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

export interface Room {
  id: string;
  score: ScoreState;
  users: Map<string, User>;
}

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

function createDefaultScore(): ScoreState {
  const pianoTrack: Track = {
    id: 'track-piano',
    name: '钢琴',
    type: 'piano',
    notes: [],
  };
  const stringsTrack: Track = {
    id: 'track-strings',
    name: '弦乐',
    type: 'strings',
    notes: [],
  };
  const drumsTrack: Track = {
    id: 'track-drums',
    name: '鼓',
    type: 'drums',
    notes: [],
  };
  return {
    tracks: [pianoTrack, stringsTrack, drumsTrack],
    bpm: 120,
    quantize: 4,
    currentTrackId: 'track-piano',
  };
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private userToRoom: Map<string, string> = new Map();

  generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(): Room {
    const code = this.generateRoomCode();
    const room: Room = {
      id: code,
      score: createDefaultScore(),
      users: new Map(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  join(roomId: string, userName: string): { room: Room; user: User } | null {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        score: createDefaultScore(),
        users: new Map(),
      };
      this.rooms.set(roomId, room);
    }
    const userId = uuidv4();
    const colorIdx = room.users.size % USER_COLORS.length;
    const user: User = {
      id: userId,
      name: userName || `用户${room.users.size + 1}`,
      color: USER_COLORS[colorIdx],
      cursor: null,
    };
    room.users.set(userId, user);
    this.userToRoom.set(userId, roomId);
    return { room, user };
  }

  leave(userId: string): { roomId: string; room: Room; user: User } | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const user = room.users.get(userId);
    if (!user) return null;
    room.users.delete(userId);
    this.userToRoom.delete(userId);
    if (room.users.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }, 60000);
    }
    return { roomId, room, user };
  }

  updateCursor(userId: string, cursor: { x: number; y: number } | null): Room | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const user = room.users.get(userId);
    if (!user) return null;
    user.cursor = cursor;
    return room;
  }

  updateScore(userId: string, score: ScoreState): Room | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.score = score;
    return room;
  }

  getRoomByUserId(userId: string): Room | undefined {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }
}

export const roomManager = new RoomManager();
