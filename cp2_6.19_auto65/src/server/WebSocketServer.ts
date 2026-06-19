import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type {
  CanvasState,
  DrawPath,
  StickyNoteData,
  WSMessage,
  WSMessageType
} from '../shared/types'

const app = express()
app.use(cors())
app.use(express.json())

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const clients = new Map<string, WebSocket>()

let canvasState: CanvasState = {
  paths: [],
  notes: []
}

const broadcast = (message: WSMessage, excludeId?: string) => {
  const data = JSON.stringify(message)
  clients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  })
}

const sendToClient = (clientId: string, message: WSMessage) => {
  const ws = clients.get(clientId)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

const broadcastUserCount = () => {
  broadcast({
    type: 'user-count',
    payload: { count: clients.size }
  })
}

wss.on('connection', (ws) => {
  const clientId = uuidv4()
  clients.set(clientId, ws)

  sendToClient(clientId, {
    type: 'init',
    payload: { clientId, state: canvasState }
  })

  broadcastUserCount()

  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString())
      handleMessage(clientId, message)
    } catch (err) {
      console.error('Failed to parse message:', err)
    }
  })

  ws.on('close', () => {
    clients.delete(clientId)
    broadcastUserCount()
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
    clients.delete(clientId)
    broadcastUserCount()
  })
})

const handleMessage = (clientId: string, message: WSMessage) => {
  const { type, payload } = message

  switch (type as WSMessageType) {
    case 'draw': {
      const path = payload as DrawPath
      const existingIdx = canvasState.paths.findIndex((p) => p.id === path.id)
      if (existingIdx >= 0) {
        canvasState.paths[existingIdx] = path
      } else {
        canvasState.paths.push(path)
      }
      broadcast({ type: 'draw', payload: path }, clientId)
      break
    }

    case 'draw-end': {
      const path = payload as DrawPath
      const existingIdx = canvasState.paths.findIndex((p) => p.id === path.id)
      if (existingIdx >= 0) {
        canvasState.paths[existingIdx] = path
      } else {
        canvasState.paths.push(path)
      }
      broadcast({ type: 'draw-end', payload: path }, clientId)
      break
    }

    case 'note-add': {
      const note = payload as StickyNoteData
      canvasState.notes.push(note)
      broadcast({ type: 'note-add', payload: note }, clientId)
      break
    }

    case 'note-update': {
      const note = payload as StickyNoteData
      const idx = canvasState.notes.findIndex((n) => n.id === note.id)
      if (idx >= 0) {
        canvasState.notes[idx] = note
        broadcast({ type: 'note-update', payload: note }, clientId)
      }
      break
    }

    case 'note-delete': {
      const { id } = payload as { id: string }
      canvasState.notes = canvasState.notes.filter((n) => n.id !== id)
      broadcast({ type: 'note-delete', payload: { id } }, clientId)
      break
    }

    case 'clear': {
      canvasState = { paths: [], notes: [] }
      broadcast({ type: 'clear', payload: null })
      break
    }

    case 'snapshot': {
      canvasState = payload as CanvasState
      broadcast({ type: 'snapshot', payload: canvasState }, clientId)
      break
    }

    default:
      break
  }
}

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Collaborative Whiteboard Server running on port ${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`)
})
