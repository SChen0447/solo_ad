import { v4 as uuidv4 } from 'uuid';
import type { Room, User, StickyNote, Vote } from '../types';
import { SERVER } from '../utils/constants';

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private codeToId: Map<string, string> = new Map();

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.codeToId.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  createRoom(topic: string, duration: number = SERVER.DEFAULT_DURATION, creator: User): Room {
    const id = uuidv4();
    const code = this.generateRoomCode();
    const room: Room = {
      id,
      code,
      topic,
      duration,
      createdAt: Date.now(),
      creatorId: creator.id,
      users: [{ ...creator, isCreator: true }],
      notes: [],
      voteEnded: false,
    };
    this.rooms.set(id, room);
    this.codeToId.set(code, id);
    return room;
  }

  getRoomByCode(code: string): Room | undefined {
    const id = this.codeToId.get(code);
    return id ? this.rooms.get(id) : undefined;
  }

  getRoomById(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  addUser(roomId: string, user: User): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.users.find((u) => u.id === user.id)) return room;
    room.users.push(user);
    return room;
  }

  removeUser(roomId: string, userId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.users = room.users.filter((u) => u.id !== userId);
    if (room.users.length === 0) {
      this.rooms.delete(roomId);
      this.codeToId.delete(room.code);
      return null;
    }
    return room;
  }

  addNote(roomId: string, note: StickyNote): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.notes.push(note);
    return room;
  }

  updateNote(roomId: string, note: StickyNote): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const idx = room.notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      room.notes[idx] = note;
    }
    return room;
  }

  deleteNote(roomId: string, noteId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.notes = room.notes.filter((n) => n.id !== noteId);
    return room;
  }

  updateVote(roomId: string, vote: Vote): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const note = room.notes.find((n) => n.id === vote.noteId);
    if (note) {
      note.vote = vote;
    }
    return room;
  }

  endVoting(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.voteEnded = true;
    return room;
  }

  setUserSpeaking(roomId: string, userId: string, speaking: boolean): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const user = room.users.find((u) => u.id === userId);
    if (user) {
      user.isSpeaking = speaking;
    }
    return room;
  }
}

export const roomManager = new RoomManager();
