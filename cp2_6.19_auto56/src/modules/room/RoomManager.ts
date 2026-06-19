import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from '../../utils/EventEmitter'
import type {
  User,
  Room,
  KeywordMessage,
  KeywordWeight,
  RoomEventMap
} from '../../types'

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

class RoomManager extends EventEmitter<RoomEventMap> {
  private rooms: Map<string, Room> = new Map()
  private currentUser: User | null = null
  private currentRoom: Room | null = null

  createRoom(roomName: string, teacherNickname: string): { roomId: string; user: User } {
    const roomId = generateRoomCode()
    const userId = uuidv4()

    const teacher: User = {
      id: userId,
      nickname: teacherNickname,
      role: 'teacher',
      roomId
    }

    const users = new Map<string, User>()
    users.set(userId, teacher)

    const room: Room = {
      id: roomId,
      name: roomName,
      teacherId: userId,
      users,
      keywords: [],
      createdAt: Date.now()
    }

    this.rooms.set(roomId, room)
    this.currentUser = teacher
    this.currentRoom = room

    return { roomId, user: teacher }
  }

  joinRoom(roomId: string, nickname: string): { room: Room; user: User } | null {
    const room = this.rooms.get(roomId.toUpperCase())
    if (!room) {
      return null
    }

    const userId = uuidv4()
    const student: User = {
      id: userId,
      nickname,
      role: 'student',
      roomId
    }

    room.users.set(userId, student)
    this.currentUser = student
    this.currentRoom = room

    this.emit('user:join', student)

    return { room, user: student }
  }

  leaveRoom(): void {
    if (this.currentRoom && this.currentUser) {
      this.currentRoom.users.delete(this.currentUser.id)
      this.emit('user:leave', this.currentUser)

      if (this.currentRoom.users.size === 0) {
        this.rooms.delete(this.currentRoom.id)
      }
    }
    this.currentUser = null
    this.currentRoom = null
  }

  submitKeyword(keyword: string): KeywordMessage | null {
    if (!this.currentRoom || !this.currentUser) {
      return null
    }

    const trimmed = keyword.trim().slice(0, 10)
    if (!trimmed) {
      return null
    }

    const message: KeywordMessage = {
      id: uuidv4(),
      roomId: this.currentRoom.id,
      userId: this.currentUser.id,
      nickname: this.currentUser.nickname,
      keyword: trimmed,
      timestamp: Date.now()
    }

    this.emit('keyword:submit', message)
    this.processKeyword(message)

    return message
  }

  private processKeyword(message: KeywordMessage): void {
    if (!this.currentRoom) return

    const existing = this.currentRoom.keywords.find(
      (kw) => kw.word.toLowerCase() === message.keyword.toLowerCase()
    )

    if (existing) {
      existing.weight += 1
      existing.lastUpdated = Date.now()
    } else {
      this.currentRoom.keywords.push({
        word: message.keyword,
        weight: 1,
        lastUpdated: Date.now()
      })
    }

    this.currentRoom.keywords.sort((a, b) => b.weight - a.weight)
    this.emit('keyword:broadcast', this.getKeywords())
  }

  clearKeywords(): void {
    if (!this.currentRoom) return
    this.currentRoom.keywords = []
    this.emit('room:clear', undefined)
    this.emit('keyword:broadcast', [])
  }

  getKeywords(): KeywordWeight[] {
    return this.currentRoom ? [...this.currentRoom.keywords] : []
  }

  getOnlineUsers(): User[] {
    return this.currentRoom ? Array.from(this.currentRoom.users.values()) : []
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  getCurrentRoom(): Room | null {
    return this.currentRoom
  }

  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher'
  }
}

export const roomManager = new RoomManager()
export type { RoomManager }
