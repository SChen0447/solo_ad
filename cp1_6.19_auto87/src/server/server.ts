import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

export interface Point {
  x: number
  y: number
}

export interface PathData {
  id: string
  points: Point[]
  color: string
  lineWidth: number
}

export interface StickyNoteData {
  id: string
  x: number
  y: number
  text: string
}

export interface ImageData {
  id: string
  x: number
  y: number
  src: string
  width: number
  height: number
}

export interface CanvasState {
  paths: PathData[]
  notes: StickyNoteData[]
  images: ImageData[]
}

export interface Meeting {
  id: string
  state: CanvasState
  users: Map<string, string>
}

const meetings = new Map<string, Meeting>()

const MAX_NOTES = 50
const MAX_IMAGES = 20

function generateMeetingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/meetings', (_req, res) => {
  let meetingId: string
  do {
    meetingId = generateMeetingId()
  } while (meetings.has(meetingId))

  const meeting: Meeting = {
    id: meetingId,
    state: { paths: [], notes: [], images: [] },
    users: new Map(),
  }
  meetings.set(meetingId, meeting)
  res.json({ meetingId })
})

app.get('/api/meetings/:meetingId', (req, res) => {
  const meeting = meetings.get(req.params.meetingId)
  if (!meeting) {
    res.status(404).json({ error: '会议不存在' })
    return
  }
  res.json({
    meetingId: meeting.id,
    state: meeting.state,
    onlineCount: meeting.users.size,
  })
})

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

io.on('connection', (socket: Socket) => {
  let currentMeetingId: string | null = null
  let currentUserId: string | null = null

  socket.on('join', ({ meetingId, userName }: { meetingId: string; userName: string }) => {
    const meeting = meetings.get(meetingId)
    if (!meeting) {
      socket.emit('error', { message: '会议不存在' })
      return
    }

    currentMeetingId = meetingId
    currentUserId = uuidv4()
    meeting.users.set(currentUserId, userName)

    socket.join(meetingId)
    socket.emit('joined', {
      userId: currentUserId,
      state: meeting.state,
    })
    io.to(meetingId).emit('userCount', meeting.users.size)
  })

  socket.on('draw:start', (data: { pathId: string; color: string; lineWidth: number; point: Point }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    const newPath: PathData = {
      id: data.pathId,
      points: [data.point],
      color: data.color,
      lineWidth: data.lineWidth,
    }
    meeting.state.paths.push(newPath)
    socket.to(currentMeetingId).emit('draw:start', data)
  })

  socket.on('draw:continue', (data: { pathId: string; point: Point }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    const path = meeting.state.paths.find(p => p.id === data.pathId)
    if (path) {
      path.points.push(data.point)
    }
    socket.to(currentMeetingId).emit('draw:continue', data)
  })

  socket.on('note:add', (note: StickyNoteData) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return
    if (meeting.state.notes.length >= MAX_NOTES) {
      socket.emit('error', { message: '便签数量已达上限' })
      return
    }
    meeting.state.notes.push(note)
    socket.to(currentMeetingId).emit('note:add', note)
  })

  socket.on('note:move', (data: { id: string; x: number; y: number }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    const note = meeting.state.notes.find(n => n.id === data.id)
    if (note) {
      note.x = data.x
      note.y = data.y
    }
    socket.to(currentMeetingId).emit('note:move', data)
  })

  socket.on('note:edit', (data: { id: string; text: string }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    const note = meeting.state.notes.find(n => n.id === data.id)
    if (note) {
      note.text = data.text.slice(0, 200)
    }
    socket.to(currentMeetingId).emit('note:edit', data)
  })

  socket.on('note:delete', (data: { id: string }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    meeting.state.notes = meeting.state.notes.filter(n => n.id !== data.id)
    socket.to(currentMeetingId).emit('note:delete', data)
  })

  socket.on('image:add', (image: ImageData) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return
    if (meeting.state.images.length >= MAX_IMAGES) {
      socket.emit('error', { message: '图片数量已达上限' })
      return
    }
    meeting.state.images.push(image)
    socket.to(currentMeetingId).emit('image:add', image)
  })

  socket.on('image:move', (data: { id: string; x: number; y: number }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    const image = meeting.state.images.find(i => i.id === data.id)
    if (image) {
      image.x = data.x
      image.y = data.y
    }
    socket.to(currentMeetingId).emit('image:move', data)
  })

  socket.on('image:delete', (data: { id: string }) => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    meeting.state.images = meeting.state.images.filter(i => i.id !== data.id)
    socket.to(currentMeetingId).emit('image:delete', data)
  })

  socket.on('canvas:clear', () => {
    if (!currentMeetingId) return
    const meeting = meetings.get(currentMeetingId)
    if (!meeting) return

    meeting.state = { paths: [], notes: [], images: [] }
    socket.to(currentMeetingId).emit('canvas:clear')
  })

  socket.on('disconnect', () => {
    if (!currentMeetingId || !currentUserId) return
    const meeting = meetings.get(currentMeetingId)
    if (meeting) {
      meeting.users.delete(currentUserId)
      io.to(currentMeetingId).emit('userCount', meeting.users.size)
    }
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
