import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import { exec } from 'child_process'
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
}

interface RoomState {
  users: Map<string, User>
  code: string
}

const rooms = new Map<string, RoomState>()

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

function updateUserActivity(socket: Socket, roomId: string) {
  const room = getRoom(roomId)
  const user = room.users.get(socket.id)
  if (user) {
    user.lastActive = Date.now()
  }
}

setInterval(() => {
  const now = Date.now()
  const INACTIVE_TIMEOUT = 10000

  rooms.forEach((room, roomId) => {
    room.users.forEach((user, userId) => {
      if (now - user.lastActive > INACTIVE_TIMEOUT) {
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

    const user: User = {
      id: socket.id,
      username: displayName,
      color: getRandomColor(),
      lastActive: Date.now(),
    }

    room.users.set(socket.id, user)

    socket.emit('joined', {
      roomId,
      userId: socket.id,
      username: displayName,
      code: room.code,
      users: Array.from(room.users.values()),
    })

    io.to(roomId).emit('user-joined', {
      userId: socket.id,
      username: displayName,
      message: `${displayName} 加入了房间`,
    })

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

    try {
      const tmpFile = join(tmpdir(), `code-${Date.now()}-${Math.random().toString(36).slice(2)}.js`)
      await writeFile(tmpFile, code)

      exec(`node "${tmpFile}"`, { timeout: 5000, maxBuffer: 1024 * 1024 }, async (error, stdout, stderr) => {
        try {
          await unlink(tmpFile)
        } catch (e) {
          // ignore cleanup errors
        }

        let output = ''
        if (stdout) output += stdout
        if (stderr) output += stderr
        if (error && error.killed) {
          output += '\n[执行超时：代码运行超过5秒]'
        } else if (error && !stderr) {
          output += `\n[执行错误：${error.message}]`
        }

        if (!output) {
          output = '[代码执行完成，无输出]'
        }

        io.to(roomId).emit('run-result', {
          output,
          userId: socket.id,
          username: user.username,
          timestamp: Date.now(),
        })
      })
    } catch (err) {
      io.to(roomId).emit('run-result', {
        output: `[执行错误：${(err as Error).message}]`,
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
        room.users.delete(socket.id)

        io.to(roomId).emit('user-left', {
          userId: socket.id,
          username: user.username,
          message: `${user.username} 已离开`,
        })

        io.to(roomId).emit('user-list', Array.from(room.users.values()))
      }
    })
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
