import type { WSMessage, UserInfo } from './types'
import useStore from './StateManager'

type MessageHandler = (msg: WSMessage) => void

class WebSocketConnection {
  private ws: WebSocket | null = null
  private url: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectDelay = 10000
  private onMessage: MessageHandler | null = null
  private disposed = false

  constructor(url: string) {
    this.url = url
  }

  connect(onMessage: MessageHandler) {
    this.onMessage = onMessage
    this.disposed = false
    this.doConnect()
  }

  private doConnect() {
    if (this.disposed) return

    try {
      this.ws = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      useStore.getState().setConnected(true)

      const state = useStore.getState()
      const user: UserInfo = {
        id: state.currentUserId,
        name: state.currentUserName,
        color: state.currentUserColor,
      }
      this.send({ type: 'join', user, userId: user.id })

      const pendingOps = state.getPendingOps()
      if (pendingOps.length > 0) {
        pendingOps.forEach((op) => this.send(op))
        state.clearPendingOps()
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        if (this.onMessage) this.onMessage(msg)
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      useStore.getState().setConnected(false)
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      useStore.getState().setConnected(false)
    }
  }

  private scheduleReconnect() {
    if (this.disposed) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    )
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.doConnect()
    }, delay)
  }

  send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      if (msg.type === 'add' || msg.type === 'update' || msg.type === 'delete') {
        useStore.getState().addPendingOp(msg)
      }
    }
  }

  disconnect() {
    this.disposed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }
    useStore.getState().setConnected(false)
  }
}

let connection: WebSocketConnection | null = null

export function getWebSocketConnection(): WebSocketConnection {
  if (!connection) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = '8080'
    const url = `${protocol}//${host}:${port}`
    connection = new WebSocketConnection(url)
  }
  return connection
}

export { WebSocketConnection }
