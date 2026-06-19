/* eslint-disable @typescript-eslint/no-explicit-any */

interface ServerRoom {
  id: string
  name: string
  teacherId: string
  keywords: { word: string; weight: number; lastUpdated: number }[]
  createdAt: number
  connections: Map<number, { userId: string; nickname: string; role: 'teacher' | 'student' }>
}

const rooms: Map<string, ServerRoom> = new Map()
let nextPortId = 0
const ports: Map<number, MessagePort> = new Map()
const portToRoom: Map<number, string> = new Map()
const portToUser: Map<number, { userId: string; nickname: string; role: 'teacher' | 'student' }> = new Map()

function broadcastToRoom(roomId: string, message: object, excludePortId?: number): void {
  for (const [portId, roomId2] of portToRoom) {
    if (roomId2 === roomId && portId !== excludePortId) {
      const port = ports.get(portId)
      if (port) {
        port.postMessage(message)
      }
    }
  }
}

function handleConnection(port: MessagePort): void {
  const portId = nextPortId++
  ports.set(portId, port)

  port.onmessage = (e: MessageEvent) => {
    const msg = e.data
    if (!msg || !msg.type) return

    switch (msg.type) {
      case 'create-room': {
        const room: ServerRoom = {
          id: msg.roomId,
          name: msg.roomName,
          teacherId: msg.userId,
          keywords: [],
          createdAt: Date.now(),
          connections: new Map()
        }
        room.connections.set(portId, { userId: msg.userId, nickname: msg.nickname, role: 'teacher' })
        rooms.set(msg.roomId, room)
        portToRoom.set(portId, msg.roomId)
        portToUser.set(portId, { userId: msg.userId, nickname: msg.nickname, role: 'teacher' })
        port.postMessage({ type: 'room-created', roomId: msg.roomId })
        break
      }

      case 'join-room': {
        const room = rooms.get(msg.roomId)
        if (!room) {
          port.postMessage({ type: 'join-failed', reason: '房间不存在' })
          return
        }
        room.connections.set(portId, { userId: msg.userId, nickname: msg.nickname, role: 'student' })
        portToRoom.set(portId, msg.roomId)
        portToUser.set(portId, { userId: msg.userId, nickname: msg.nickname, role: 'student' })

        port.postMessage({
          type: 'join-success',
          roomId: msg.roomId,
          keywords: room.keywords,
          onlineCount: room.connections.size
        })

        broadcastToRoom(msg.roomId, {
          type: 'user-joined',
          userId: msg.userId,
          nickname: msg.nickname,
          onlineCount: room.connections.size
        }, portId)
        break
      }

      case 'submit-keyword': {
        const room2 = rooms.get(msg.roomId)
        if (!room2) return

        const existing = room2.keywords.find((kw: { word: string }) => kw.word.toLowerCase() === msg.keyword.toLowerCase())
        if (existing) {
          existing.weight += 1
          existing.lastUpdated = Date.now()
        } else {
          room2.keywords.push({ word: msg.keyword, weight: 1, lastUpdated: Date.now() })
        }
        room2.keywords.sort((a: { weight: number }, b: { weight: number }) => b.weight - a.weight)

        broadcastToRoom(msg.roomId, {
          type: 'keyword-update',
          keywords: room2.keywords
        })
        break
      }

      case 'clear-keywords': {
        const room3 = rooms.get(msg.roomId)
        if (!room3) return
        room3.keywords = []
        broadcastToRoom(msg.roomId, {
          type: 'keywords-cleared'
        })
        break
      }

      case 'sync-request': {
        const room4 = rooms.get(msg.roomId)
        if (!room4) return
        port.postMessage({
          type: 'sync-response',
          keywords: room4.keywords,
          onlineCount: room4.connections.size
        })
        break
      }

      case 'leave-room': {
        disconnectPort(portId)
        break
      }
    }
  }

  port.start()
}

function disconnectPort(portId: number): void {
  const roomId = portToRoom.get(portId)
  const user = portToUser.get(portId)
  if (roomId && user) {
    const room = rooms.get(roomId)
    if (room) {
      room.connections.delete(portId)
      broadcastToRoom(roomId, {
        type: 'user-left',
        userId: user.userId,
        onlineCount: room.connections.size
      })
      if (room.connections.size === 0) {
        rooms.delete(roomId)
      }
    }
  }
  portToRoom.delete(portId)
  portToUser.delete(portId)
  ports.delete(portId)
}

declare const self: any

if (typeof self.onconnect === 'undefined') {
  self.onmessage = (e: MessageEvent) => {
    handleConnection(e.source as unknown as MessagePort)
  }
} else {
  self.onconnect = (e: Event) => {
    const event = e as MessageEvent
    const port = event.ports[0]
    handleConnection(port)
  }
}

export {}
