import { io, Socket } from 'socket.io-client'

export interface UserCursor {
  line: number
  column: number
}

export interface UserSelection {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export interface User {
  id: string
  username: string
  color: string
  cursor: UserCursor
  selection: UserSelection | null
  last_active: number
}

export interface CodeChange {
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
  text: string
}

export interface CodeResult {
  text: string
  html: string | null
  error: string | null
  duration: number
}

export interface ProjectState {
  code: string
  users: User[]
  files: string[]
  current_file: string
}

export type EventCallback = (data: any) => void

class CollaborationManager {
  private socket: Socket | null = null
  private projectId: string = 'default'
  private userId: string = ''
  private username: string = ''
  private listeners: Map<string, EventCallback[]> = new Map()
  private connected: boolean = false

  constructor() {
    this.userId = this.generateUserId()
    this.username = `用户${Math.floor(Math.random() * 10000)}`
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substring(2, 15)
  }

  getUserId(): string {
    return this.userId
  }

  getUsername(): string {
    return this.username
  }

  setUsername(name: string): void {
    this.username = name
  }

  isConnected(): boolean {
    return this.connected
  }

  connect(projectId: string = 'default'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.projectId = projectId

      try {
        this.socket = io({
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        })

        this.socket.on('connect', () => {
          this.connected = true
          this.emit('connect', { socketId: this.socket?.id })
          
          this.socket?.emit('join_project', {
            project_id: this.projectId,
            user_id: this.userId,
            username: this.username,
          })
        })

        this.socket.on('disconnect', () => {
          this.connected = false
          this.emit('disconnect', {})
        })

        this.socket.on('connect_error', (error: Error) => {
          this.connected = false
          this.emit('connect_error', error)
          reject(error)
        })

        this.socket.on('user_joined', (data: { user: User; users: User[] }) => {
          this.emit('user_joined', data)
        })

        this.socket.on('user_left', (data: { user_id: string; users: User[] }) => {
          this.emit('user_left', data)
        })

        this.socket.on('project_state', (data: ProjectState) => {
          this.emit('project_state', data)
          resolve()
        })

        this.socket.on('code_update', (data: { code: string; user_id: string; changes: CodeChange[] }) => {
          this.emit('code_update', data)
        })

        this.socket.on('cursor_update', (data: { user_id: string; cursor: UserCursor; selection: UserSelection | null }) => {
          this.emit('cursor_update', data)
        })

        this.socket.on('code_result', (data: { result: CodeResult; user_id: string }) => {
          this.emit('code_result', data)
        })

        this.socket.on('file_added', (data: { filename: string; files: string[] }) => {
          this.emit('file_added', data)
        })

        this.socket.on('file_deleted', (data: { filename: string; files: string[] }) => {
          this.emit('file_deleted', data)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('leave_project', {
        project_id: this.projectId,
        user_id: this.userId,
      })
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  sendCodeChange(code: string, changes: CodeChange[]): void {
    if (this.socket && this.connected) {
      this.socket.emit('code_change', {
        project_id: this.projectId,
        user_id: this.userId,
        code,
        changes,
      })
    }
  }

  sendCursorChange(cursor: UserCursor, selection: UserSelection | null): void {
    if (this.socket && this.connected) {
      this.socket.emit('cursor_change', {
        project_id: this.projectId,
        user_id: this.userId,
        cursor,
        selection,
      })
    }
  }

  runCode(code: string): void {
    if (this.socket && this.connected) {
      this.socket.emit('run_code', {
        project_id: this.projectId,
        code,
        user_id: this.userId,
      })
    }
  }

  addFile(filename: string): void {
    if (this.socket && this.connected) {
      this.socket.emit('add_file', {
        project_id: this.projectId,
        filename,
      })
    }
  }

  deleteFile(filename: string): void {
    if (this.socket && this.connected) {
      this.socket.emit('delete_file', {
        project_id: this.projectId,
        filename,
      })
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }
}

const collabManager = new CollaborationManager()
export default collabManager
