import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from '../../utils/EventEmitter'
import type {
  User,
  Room,
  KeywordMessage,
  KeywordWeight,
  RoomEventMap
} from '../../types'

type BroadcastMessage =
  | { type: 'keyword'; roomId: string; message: KeywordMessage }
  | { type: 'clear'; roomId: string }
  | { type: 'sync-request'; roomId: string; requesterId: string }
  | { type: 'sync-response'; roomId: string; keywords: KeywordWeight[]; onlineCount: number }
  | { type: 'user-join'; roomId: string; user: User }
  | { type: 'user-leave'; roomId: string; userId: string }

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const STORAGE_PREFIX = 'wordcloud-room:'

class RoomManager extends EventEmitter<RoomEventMap> {
  private rooms: Map<string, Room> = new Map()
  private currentUser: User | null = null
  private currentRoom: Room | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private clientId: string = uuidv4()

  constructor() {
    super()
    this.initBroadcastChannel()
  }

  private initBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel('wordcloud-realtime')
      this.broadcastChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        this.handleBroadcastMessage(event.data)
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported, using localStorage fallback')
      this.initLocalStorageFallback()
    }
  }

  private initLocalStorageFallback(): void {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key && e.key.startsWith(STORAGE_PREFIX) && e.newValue) {
        try {
          const message: BroadcastMessage = JSON.parse(e.newValue)
          this.handleBroadcastMessage(message)
        } catch {
          // ignore parse errors
        }
      }
    })
  }

  private postMessage(message: BroadcastMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message)
    } else {
      const key = STORAGE_PREFIX + message.type + '-' + Date.now() + '-' + Math.random()
      localStorage.setItem(key, JSON.stringify(message))
      setTimeout(() => localStorage.removeItem(key), 1000)
    }
  }

  private handleBroadcastMessage(message: BroadcastMessage): void {
    if (!this.currentRoom || message.roomId !== this.currentRoom.id) return

    switch (message.type) {
      case 'keyword':
        if (message.message.userId !== this.currentUser?.id) {
          this.processKeyword(message.message, false)
        }
        break
      case 'clear':
        this.currentRoom.keywords = []
        this.emit('room:clear', undefined)
        this.emit('keyword:broadcast', [])
        break
      case 'sync-request':
        if (this.currentUser?.role === 'teacher' && message.requesterId !== this.clientId) {
          this.postMessage({
            type: 'sync-response',
            roomId: this.currentRoom.id,
            keywords: this.getKeywords(),
            onlineCount: this.getOnlineUsers().length
          })
        }
        break
      case 'sync-response':
        if (this.currentUser?.role === 'student') {
          this.currentRoom.keywords = message.keywords
          this.emit('keyword:broadcast', message.keywords)
        }
        break
      case 'user-join':
        if (message.user.id !== this.currentUser?.id) {
          this.currentRoom.users.set(message.user.id, message.user)
          this.emit('user:join', message.user)
        }
        break
      case 'user-leave':
        if (message.userId !== this.currentUser?.id) {
          this.currentRoom.users.delete(message.userId)
          this.emit('user:leave', { id: message.userId } as User)
        }
        break
    }
  }

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

    sessionStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify({
      id: roomId,
      name: roomName,
      teacherId: userId,
      createdAt: room.createdAt
    }))

    return { roomId, user: teacher }
  }

  joinRoom(roomId: string, nickname: string): { room: Room; user: User } | null {
    const normalizedId = roomId.toUpperCase()

    let room = this.rooms.get(normalizedId)
    if (!room) {
      const stored = sessionStorage.getItem(STORAGE_PREFIX + normalizedId)
      if (!stored) {
        return null
      }
      try {
        const storedRoom = JSON.parse(stored)
        room = {
          ...storedRoom,
          users: new Map<string, User>(),
          keywords: []
        }
        this.rooms.set(normalizedId, room)
      } catch {
        return null
      }
    }

    const userId = uuidv4()
    const student: User = {
      id: userId,
      nickname,
      role: 'student',
      roomId: normalizedId
    }

    room.users.set(userId, student)
    this.currentUser = student
    this.currentRoom = room

    this.postMessage({
      type: 'user-join',
      roomId: normalizedId,
      user: student
    })

    this.postMessage({
      type: 'sync-request',
      roomId: normalizedId,
      requesterId: this.clientId
    })

    this.emit('user:join', student)

    return { room, user: student }
  }

  leaveRoom(): void {
    if (this.currentRoom && this.currentUser) {
      this.postMessage({
        type: 'user-leave',
        roomId: this.currentRoom.id,
        userId: this.currentUser.id
      })
      this.currentRoom.users.delete(this.currentUser.id)
      this.emit('user:leave', this.currentUser)

      if (this.currentRoom.users.size === 0) {
        this.rooms.delete(this.currentRoom.id)
        sessionStorage.removeItem(STORAGE_PREFIX + this.currentRoom.id)
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
    this.processKeyword(message, true)
    this.postMessage({
      type: 'keyword',
      roomId: this.currentRoom.id,
      message
    })

    return message
  }

  private processKeyword(message: KeywordMessage, isLocal: boolean): void {
    if (!this.currentRoom) return
    void isLocal

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
    this.postMessage({
      type: 'clear',
      roomId: this.currentRoom.id
    })
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

  destroy(): void {
    this.leaveRoom()
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.removeAllListeners()
  }
}

export const roomManager = new RoomManager()
export type { RoomManager }
