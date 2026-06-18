import express, { Request, Response } from 'express'
import http from 'http'
import { Server, Socket } from 'socket.io'
import cuid from 'cuid'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

interface User {
  id: string
  nickname: string
  socketId: string
}

interface PuzzlePiece {
  id: string
  row: number
  col: number
  x: number
  y: number
  rotation: number
  isPlaced: boolean
  placedBy?: string
}

interface RoomState {
  roomCode: string
  hostId: string
  users: User[]
  imageDataUrl: string | null
  gridSize: number
  pieces: PuzzlePiece[]
  createdAt: number
}

const rooms = new Map<string, RoomState>()

const generateRoomCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const getRoomByUserSocket = (socketId: string): RoomState | undefined => {
  for (const room of rooms.values()) {
    if (room.users.some(u => u.socketId === socketId)) {
      return room
    }
  }
  return undefined
}

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id)

  socket.on('create-room', (data: { nickname: string }) => {
    const roomCode = generateRoomCode()
    const userId = cuid()
    
    const user: User = {
      id: userId,
      nickname: data.nickname || '匿名用户',
      socketId: socket.id
    }

    const room: RoomState = {
      roomCode,
      hostId: userId,
      users: [user],
      imageDataUrl: null,
      gridSize: 3,
      pieces: [],
      createdAt: Date.now()
    }

    rooms.set(roomCode, room)
    socket.join(roomCode)
    
    socket.emit('room-created', {
      roomCode,
      userId,
      users: room.users
    })
    
    console.log('Room created:', roomCode, 'by:', data.nickname)
  })

  socket.on('join-room', (data: { roomCode: string; nickname: string }) => {
    const room = rooms.get(data.roomCode)
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' })
      return
    }

    const userId = cuid()
    const user: User = {
      id: userId,
      nickname: data.nickname || '匿名用户',
      socketId: socket.id
    }

    room.users.push(user)
    socket.join(data.roomCode)

    socket.emit('joined-room', {
      roomCode: data.roomCode,
      userId,
      users: room.users,
      imageDataUrl: room.imageDataUrl,
      gridSize: room.gridSize,
      pieces: room.pieces
    })

    io.to(data.roomCode).emit('user-joined', {
      users: room.users
    })

    console.log('User joined room:', data.roomCode, 'user:', data.nickname)
  })

  socket.on('update-image', (data: { roomCode: string; imageDataUrl: string; gridSize: number; pieces: PuzzlePiece[] }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    room.imageDataUrl = data.imageDataUrl
    room.gridSize = data.gridSize
    room.pieces = data.pieces

    io.to(data.roomCode).emit('image-updated', {
      imageDataUrl: data.imageDataUrl,
      gridSize: data.gridSize,
      pieces: data.pieces
    })
  })

  socket.on('piece-moved', (data: { roomCode: string; pieceId: string; x: number; y: number; rotation: number; userId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    const piece = room.pieces.find(p => p.id === data.pieceId)
    if (piece) {
      piece.x = data.x
      piece.y = data.y
      piece.rotation = data.rotation
    }

    socket.to(data.roomCode).emit('piece-moved', {
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
      rotation: data.rotation,
      userId: data.userId
    })
  })

  socket.on('piece-placed', (data: { roomCode: string; pieceId: string; userId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    const piece = room.pieces.find(p => p.id === data.pieceId)
    if (piece) {
      piece.isPlaced = true
      piece.placedBy = data.userId
    }

    io.to(data.roomCode).emit('piece-placed', {
      pieceId: data.pieceId,
      userId: data.userId
    })

    const allPlaced = room.pieces.every(p => p.isPlaced)
    if (allPlaced) {
      io.to(data.roomCode).emit('puzzle-complete', {
        completedBy: data.userId,
        completedAt: Date.now()
      })
    }
  })

  socket.on('drag-start', (data: { roomCode: string; pieceId: string; userId: string; x: number; y: number }) => {
    socket.to(data.roomCode).emit('drag-start', {
      pieceId: data.pieceId,
      userId: data.userId,
      x: data.x,
      y: data.y
    })
  })

  socket.on('drag-move', (data: { roomCode: string; pieceId: string; userId: string; x: number; y: number }) => {
    socket.to(data.roomCode).emit('drag-move', {
      pieceId: data.pieceId,
      userId: data.userId,
      x: data.x,
      y: data.y
    })
  })

  socket.on('drag-end', (data: { roomCode: string; pieceId: string; userId: string }) => {
    socket.to(data.roomCode).emit('drag-end', {
      pieceId: data.pieceId,
      userId: data.userId
    })
  })

  socket.on('sync-state', (data: { roomCode: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    socket.emit('state-synced', {
      users: room.users,
      imageDataUrl: room.imageDataUrl,
      gridSize: room.gridSize,
      pieces: room.pieces
    })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    
    const room = getRoomByUserSocket(socket.id)
    if (room) {
      room.users = room.users.filter(u => u.socketId !== socket.id)
      
      if (room.users.length === 0) {
        rooms.delete(room.roomCode)
        console.log('Room deleted:', room.roomCode)
      } else {
        io.to(room.roomCode).emit('user-left', {
          users: room.users
        })
      }
    }
  })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})
