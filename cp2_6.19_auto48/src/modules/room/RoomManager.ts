import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../../utils/EventEmitter';
import type { RoomData, RoomMember } from '../../types';

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map();
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.setupBroadcastChannel();
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('wordcloud-room');
      this.channel.onmessage = (event) => {
        const { type, payload } = event.data;
        this.handleBroadcastMessage(type, payload);
      };
    }
  }

  private handleBroadcastMessage(type: string, payload: any): void {
    switch (type) {
      case 'word-added':
        if (payload.roomId === this.currentRoomId) {
          eventBus.emit('word:added', payload.word, payload.userId);
        }
        break;
      case 'room-cleared':
        if (payload.roomId === this.currentRoomId) {
          eventBus.emit('room:cleared');
        }
        break;
      case 'member-joined':
        if (payload.roomId === this.currentRoomId) {
          eventBus.emit('member:joined', payload.member);
        }
        break;
      case 'member-left':
        if (payload.roomId === this.currentRoomId) {
          eventBus.emit('member:left', payload.memberId);
        }
        break;
    }
  }

  private broadcast(type: string, payload: any): void {
    if (this.channel) {
      this.channel.postMessage({ type, payload });
    }
  }

  createRoom(roomName: string, teacherNickname: string): { roomId: string; teacherId: string } {
    const roomId = this.generateRoomCode();
    const teacherId = uuidv4();

    const teacher: RoomMember = {
      id: teacherId,
      nickname: teacherNickname,
      role: 'teacher'
    };

    const room: RoomData = {
      id: roomId,
      name: roomName,
      teacherId,
      members: [teacher],
      words: new Map(),
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.currentRoomId = roomId;
    this.currentUserId = teacherId;

    this.broadcast('room-created', { roomId, roomName, teacherId });

    return { roomId, teacherId };
  }

  joinRoom(roomId: string, nickname: string): { success: boolean; message: string; memberId?: string } {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: '房间不存在' };
    }

    const memberId = uuidv4();
    const member: RoomMember = {
      id: memberId,
      nickname,
      role: 'student'
    };

    room.members.push(member);
    this.currentRoomId = roomId;
    this.currentUserId = memberId;

    this.broadcast('member-joined', { roomId, member });
    eventBus.emit('member:joined', member);

    return { success: true, message: '加入成功', memberId };
  }

  leaveRoom(): void {
    if (!this.currentRoomId || !this.currentUserId) return;

    const room = this.rooms.get(this.currentRoomId);
    if (room) {
      room.members = room.members.filter((m) => m.id !== this.currentUserId);
      this.broadcast('member-left', { roomId: this.currentRoomId, memberId: this.currentUserId });
      eventBus.emit('member:left', this.currentUserId);
    }

    this.currentRoomId = null;
    this.currentUserId = null;
  }

  addWord(word: string): boolean {
    if (!this.currentRoomId || !this.currentUserId) return false;
    if (!word || word.trim().length === 0 || word.length > 10) return false;

    const room = this.rooms.get(this.currentRoomId);
    if (!room) return false;

    const trimmedWord = word.trim();
    const currentCount = room.words.get(trimmedWord) || 0;
    room.words.set(trimmedWord, currentCount + 1);

    this.broadcast('word-added', {
      roomId: this.currentRoomId,
      word: trimmedWord,
      userId: this.currentUserId
    });

    eventBus.emit('word:added', trimmedWord, this.currentUserId);

    return true;
  }

  clearRoom(): boolean {
    if (!this.currentRoomId || !this.currentUserId) return false;

    const room = this.rooms.get(this.currentRoomId);
    if (!room || room.teacherId !== this.currentUserId) return false;

    room.words.clear();

    this.broadcast('room-cleared', { roomId: this.currentRoomId });
    eventBus.emit('room:cleared');

    return true;
  }

  getWords(): Map<string, number> {
    if (!this.currentRoomId) return new Map();
    const room = this.rooms.get(this.currentRoomId);
    return room ? new Map(room.words) : new Map();
  }

  getCurrentRoom(): RoomData | null {
    if (!this.currentRoomId) return null;
    return this.rooms.get(this.currentRoomId) || null;
  }

  getMembers(): RoomMember[] {
    const room = this.getCurrentRoom();
    return room ? [...room.members] : [];
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  destroy(): void {
    this.leaveRoom();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const roomManager = new RoomManager();
