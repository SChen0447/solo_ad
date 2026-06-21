import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const app = express()
app.use(cors())
app.use(express.json())

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

interface User {
  id: string
  username: string
  color: string
  lastActive: number
  disconnectedAt?: number
}

interface RoomState {
  users: Map<string, User>
  code: string
}

interface SelectionRange {
  from: number
  to: number
  head: number
  anchor: number
}

const rooms = new Map<string, RoomState>()
const disconnectTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>()

const COLORS = ['#60A5FA', '#F59E0B', '#10B981', '#EF4444']

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function getRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      code: '// 欢迎来到实时代码协作\n// 开始编写你的代码吧\n\nfunction hello() {\n  console.log("Hello, World!");\n}\n\nhello();\n',
    })
  }
  return rooms.get(roomId)!
}

function getRoomTimers(roomId: string): Map<string, ReturnType<typeof setTimeout>> {
  if (!disconnectTimers.has(roomId)) {
    disconnectTimers.set(roomId, new Map())
  }
  return disconnectTimers.get(roomId)!
}

function updateUserActivity(socket: Socket, roomId: string) {
  const room = getRoom(roomId)
  const user = room.users.get(socket.id)
  if (user) {
    user.lastActive = Date.now()
  }
}

function clearDisconnectTimer(roomId: string, userId: string) {
  const roomTimers = getRoomTimers(roomId)
  const timer = roomTimers.get(userId)
  if (timer) {
    clearTimeout(timer)
    roomTimers.delete(userId)
  }
}

function scheduleDisconnectCleanup(socket: Socket, roomId: string, user: User) {
  const roomTimers = getRoomTimers(roomId)
  clearDisconnectTimer(roomId, socket.id)

  const timer = setTimeout(() => {
    const room = getRoom(roomId)
    if (room.users.has(socket.id)) {
      room.users.delete(socket.id)
      roomTimers.delete(socket.id)

      io.to(roomId).emit('user-left', {
        userId: socket.id,
        username: user.username,
        message: `${user.username} 已离开`,
      })

      io.to(roomId).emit('user-list', Array.from(room.users.values()))

      console.log(`User ${user.username} cleaned up from room ${roomId} after 10s timeout`)
    }
  }, 10000)

  roomTimers.set(socket.id, timer)
}

setInterval(() => {
  const now = Date.now()
  const INACTIVE_TIMEOUT = 10000

  rooms.forEach((room, roomId) => {
    room.users.forEach((user, userId) => {
      if (now - user.lastActive > INACTIVE_TIMEOUT && !user.disconnectedAt) {
        const socket = io.sockets.sockets.get(userId)
        if (socket) {
          socket.leave(roomId)
          io.to(roomId).emit('user-left', {
            userId,
            username: user.username,
            message: `${user.username} 因长时间未操作已离开`,
          })
          io.to(roomId).emit('user-list', Array.from(room.users.values()))
        }
        room.users.delete(userId)
      }
    })
  })
}, 1000)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', ({ roomId, username }: { roomId: string; username: string }) => {
    if (!roomId || roomId.trim().length === 0 || roomId.length > 20) {
      socket.emit('error-message', '房间名称不能为空且不超过20个字符')
      return
    }

    const displayName = username && username.trim() ? username.trim() : `用户${socket.id.slice(0, 4)}`
    const room = getRoom(roomId)

    socket.join(roomId)
    clearDisconnectTimer(roomId, socket.id)

    const existingUser = room.users.get(socket.id)
    const user: User = existingUser || {
      id: socket.id,
      username: displayName,
      color: getRandomColor(),
      lastActive: Date.now(),
    }
    user.lastActive = Date.now()
    delete user.disconnectedAt

    room.users.set(socket.id, user)

    socket.emit('joined', {
      roomId,
      userId: socket.id,
      username: user.username,
      code: room.code,
      users: Array.from(room.users.values()),
    })

    if (!existingUser) {
      io.to(roomId).emit('user-joined', {
        userId: socket.id,
        username: displayName,
        message: `${displayName} 加入了房间`,
      })
    } else {
      io.to(roomId).emit('user-joined', {
        userId: socket.id,
        username: displayName,
        message: `${displayName} 重新连接`,
      })
    }

    io.to(roomId).emit('user-list', Array.from(room.users.values()))

    console.log(`User ${displayName} joined room ${roomId}`)
  })

  socket.on('code-change', ({ roomId, code }: { roomId: string; code: string }) => {
    const room = getRoom(roomId)
    room.code = code
    updateUserActivity(socket, roomId)

    socket.to(roomId).emit('code-change', {
      code,
      userId: socket.id,
    })
  })

  socket.on('selection-change', ({ roomId, selection }: { roomId: string; selection: SelectionRange }) => {
    updateUserActivity(socket, roomId)
    socket.to(roomId).emit('selection-change', {
      selection,
      userId: socket.id,
    })
  })

  socket.on('chat-message', ({ roomId, message }: { roomId: string; message: string }) => {
    const room = getRoom(roomId)
    const user = room.users.get(socket.id)
    updateUserActivity(socket, roomId)

    if (user && message && message.trim()) {
      const chatMessage = {
        userId: socket.id,
        username: user.username,
        message: message.trim(),
        timestamp: Date.now(),
      }

      io.to(roomId).emit('chat-message', chatMessage)
    }
  })

  socket.on('run-code', async ({ roomId, code }: { roomId: string; code: string }) => {
    const room = getRoom(roomId)
    const user = room.users.get(socket.id)
    updateUserActivity(socket, roomId)

    if (!user) return

    let tmpFile = ''
    try {
      tmpFile = join(tmpdir(), `code-${Date.now()}-${Math.random().toString(36).slice(2)}.js`)
      await writeFile(tmpFile, code)

      const child = spawn('node', [tmpFile], {
        timeout: 5000,
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=64' },
      })

      let stdoutData = ''
      let stderrData = ''
      let timedOut = false

      child.stdout.on('data', (data) => {
        stdoutData += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderrData += data.toString()
      })

      child.on('error', (err) => {
        stderrData += `[执行错误：${err.message}]\n`
      })

      child.on('close', async (code) => {
        try {
          await unlink(tmpFile)
        } catch (e) {
          // ignore cleanup errors
        }

        if (timedOut) {
          stderrData += '\n[执行超时：代码运行超过5秒]'
        }

        if (code !== null && code !== 0 && !stderrData && !stdoutData) {
          stderrData += `[进程退出码：${code}]`
        }

        if (!stdoutData && !stderrData) {
          stdoutData = '[代码执行完成，无输出]'
        }

        io.to(roomId).emit('run-result', {
          stdout: stdoutData,
          stderr: stderrData,
          userId: socket.id,
          username: user.username,
          timestamp: Date.now(),
        })
      })

      setTimeout(() => {
        if (!child.killed) {
          timedOut = true
          child.kill('SIGKILL')
        }
      }, 5000)
    } catch (err) {
      if (tmpFile) {
        try {
          await unlink(tmpFile)
        } catch (e) {
          // ignore
        }
      }
      io.to(roomId).emit('run-result', {
        stdout: '',
        stderr: `[执行错误：${(err as Error).message}]`,
        userId: socket.id,
        username: user.username,
        timestamp: Date.now(),
      })
    }
  })

  socket.on('user-activity', ({ roomId }: { roomId: string }) => {
    updateUserActivity(socket, roomId)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)

    rooms.forEach((room, roomId) => {
      const user = room.users.get(socket.id)
      if (user) {
        user.disconnectedAt = Date.now()

        socket.to(roomId).emit('user-offline', {
          userId: socket.id,
          username: user.username,
        })

        scheduleDisconnectCleanup(socket, roomId, user)
      }
    })
  })
})

const PORT = Number(process.env.PORT) || 3002
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
