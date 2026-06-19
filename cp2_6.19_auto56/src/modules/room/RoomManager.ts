import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from '../../utils/EventEmitter'
import type {
  User,
  Room,
  KeywordMessage,
  KeywordWeight,
  RoomEventMap
} from '../../types'

interface ServerMessage {
  type: string
  [key: string]: unknown
}

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

class WebSocketClient {
  private sharedWorker: SharedWorker | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private messageHandler: ((msg: ServerMessage) => void) | null = null
  private useFallback: boolean = false

  connect(onMessage: (msg: ServerMessage) => void): void {
    this.messageHandler = onMessage

    try {
      this.sharedWorker = new SharedWorker(
        new URL('./SignalingServer.worker.ts', import.meta.url),
        { type: 'module', name: 'wordcloud-signaling' }
      )
      this.sharedWorker.port.onmessage = (e: MessageEvent<ServerMessage>) => {
        if (this.messageHandler) {
          this.messageHandler(e.data)
        }
      }
      this.sharedWorker.port.start()
      this.useFallback = false
    } catch {
      console.warn('SharedWorker unavailable, falling back to BroadcastChannel')
      this.initBroadcastFallback()
    }
  }

  private initBroadcastFallback(): void {
    this.useFallback = true
    try {
      this.broadcastChannel = new BroadcastChannel('wordcloud-signaling')
      this.broadcastChannel.onmessage = (e: MessageEvent<ServerMessage>) => {
        if (this.messageHandler) {
          this.messageHandler(e.data)
        }
      }
    } catch {
      console.warn('BroadcastChannel also unavailable, running in standalone mode')
    }
  }

  send(msg: object): void {
    if (this.sharedWorker && this.sharedWorker.port) {
      this.sharedWorker.port.postMessage(msg)
    } else if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg)
    }
  }

  disconnect(): void {
    if (this.sharedWorker) {
      this.sharedWorker.port.close()
      this.sharedWorker = null
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.messageHandler = null
  }

  isUsingFallback(): boolean {
    return this.useFallback
  }
}

class RoomManager extends EventEmitter<RoomEventMap> {
  private rooms: Map<string, Room> = new Map()
  private currentUser: User | null = null
  private currentRoom: Room | null = null
  private wsClient: WebSocketClient = new WebSocketClient()
  private pendingWsMessages: object[] = []
  private wsConnected: boolean = false

  constructor() {
    super()
    this.wsClient.connect((msg) => this.handleServerMessage(msg))
    this.wsConnected = true
    for (const m of this.pendingWsMessages) {
      this.wsClient.send(m)
    }
    this.pendingWsMessages = []
  }

  private sendToServer(msg: object): void {
    if (this.wsConnected) {
      this.wsClient.send(msg)
    } else {
      this.pendingWsMessages.push(msg)
    }
  }

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'keyword-update':
        if (this.currentRoom) {
          this.currentRoom.keywords = (msg.keywords as KeywordWeight[]).map(kw => ({ ...kw }))
          this.currentRoom.keywords.sort((a, b) => b.weight - a.weight)
          this.emit('keyword:broadcast', this.getKeywords())
        }
        break

      case 'keywords-cleared':
        if (this.currentRoom) {
          this.currentRoom.keywords = []
          this.emit('room:clear', undefined)
          this.emit('keyword:broadcast', [])
        }
        break

      case 'user-joined':
        if (this.currentRoom && (msg.userId as string) !== this.currentUser?.id) {
          const joinedUser: User = {
            id: msg.userId as string,
            nickname: msg.nickname as string,
            role: 'student',
            roomId: this.currentRoom.id
          }
          this.currentRoom.users.set(joinedUser.id, joinedUser)
          this.emit('user:join', joinedUser)
        }
        break

      case 'user-left':
        if (this.currentRoom) {
          this.currentRoom.users.delete(msg.userId as string)
          this.emit('user:leave', { id: msg.userId as string } as User)
        }
        break

      case 'join-success':
        if (this.currentRoom) {
          this.currentRoom.keywords = (msg.keywords as KeywordWeight[]).map(kw => ({ ...kw }))
          this.emit('keyword:broadcast', this.getKeywords())
        }
        break

      case 'join-failed':
        break

      case 'sync-response':
        if (this.currentRoom) {
          this.currentRoom.keywords = (msg.keywords as KeywordWeight[]).map(kw => ({ ...kw }))
          this.emit('keyword:broadcast', this.getKeywords())
        }
        break

      case 'room-created':
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

    this.sendToServer({
      type: 'create-room',
      roomId,
      roomName,
      userId,
      nickname: teacherNickname
    })

    return { roomId, user: teacher }
  }

  joinRoom(roomId: string, nickname: string): { room: Room; user: User } | null {
    const normalizedId = roomId.toUpperCase()
    const userId = uuidv4()

    const student: User = {
      id: userId,
      nickname,
      role: 'student',
      roomId: normalizedId
    }

    const users = new Map<string, User>()
    users.set(userId, student)

    const room: Room = {
      id: normalizedId,
      name: '',
      teacherId: '',
      users,
      keywords: [],
      createdAt: Date.now()
    }

    this.rooms.set(normalizedId, room)
    this.currentUser = student
    this.currentRoom = room

    this.sendToServer({
      type: 'join-room',
      roomId: normalizedId,
      userId,
      nickname
    })

    this.emit('user:join', student)

    return { room, user: student }
  }

  leaveRoom(): void {
    if (this.currentRoom && this.currentUser) {
      this.sendToServer({
        type: 'leave-room',
        roomId: this.currentRoom.id,
        userId: this.currentUser.id
      })
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

    this.sendToServer({
      type: 'submit-keyword',
      roomId: this.currentRoom.id,
      keyword: trimmed,
      userId: this.currentUser.id
    })

    return message
  }

  clearKeywords(): void {
    if (!this.currentRoom) return
    this.currentRoom.keywords = []
    this.emit('room:clear', undefined)
    this.emit('keyword:broadcast', [])

    this.sendToServer({
      type: 'clear-keywords',
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
    this.wsClient.disconnect()
    this.removeAllListeners()
  }
}

export const roomManager = new RoomManager()
export type { RoomManager }
