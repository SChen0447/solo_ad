import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor, { SelectionRange } from './Editor'
import Chat from './Chat'
import RunButton, { OutputPanel, RunResult } from './RunButton'

interface User {
  id: string
  username: string
  color: string
}

interface ChatMessage {
  userId: string
  username: string
  message: string
  timestamp: number
}

interface RoomJoinedData {
  roomId: string
  userId: string
  username: string
  code: string
  users: User[]
}

function UserAvatar({ username, color, size = 32, dimmed = false }: { username: string; color: string; size?: number; dimmed?: boolean }) {
  const initial = username.charAt(0).toUpperCase()
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: dimmed ? '#4B5563' : color,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.45}px`,
        fontWeight: 600,
        flexShrink: 0,
        opacity: dimmed ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}
      title={username}
    >
      {initial}
    </div>
  )
}

function OnlineUsersList({ users, offlineUsers }: { users: User[]; offlineUsers: Set<string> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          {users.slice(0, 3).map((user, index) => (
            <div
              key={user.id}
              style={{
                marginLeft: index > 0 ? '-8px' : '0',
                zIndex: users.length - index,
                position: 'relative',
              }}
            >
              <UserAvatar
                username={user.username}
                color={user.color}
                dimmed={offlineUsers.has(user.id)}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 600,
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #2D2D3F',
          }}
        >
          {users.length}
        </div>
      </div>
    </div>
  )
}

function JoinScreen({ onJoin }: { onJoin: (roomId: string, username: string) => void }) {
  const [roomId, setRoomId] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomId.trim()) {
      setError('请输入房间名称')
      return
    }
    if (roomId.length > 20) {
      setError('房间名称不能超过20个字符')
      return
    }
    onJoin(roomId.trim(), username.trim())
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1E2E',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#2D2D3F',
          padding: '40px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h1
          style={{
            color: '#F3F4F6',
            fontSize: '24px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          实时代码协作
        </h1>
        <p style={{ color: '#9CA3AF', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>
          多人实时协同编写和运行代码
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#D1D5DB',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: 500,
              }}
            >
              房间名称 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value)
                setError('')
              }}
              placeholder="输入房间名称"
              maxLength={20}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                border: error ? '1px solid #EF4444' : '1px solid #4B5563',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: '#D1D5DB',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: 500,
              }}
            >
              用户名 <span style={{ color: '#9CA3AF' }}>(可选)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的昵称"
              maxLength={20}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                border: '1px solid #4B5563',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#34D399'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10B981'
            }}
          >
            加入房间
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [code, setCode] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [offlineUsers, setOfflineUsers] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const reconnectAttemptsRef = useRef(0)
  const savedRoomRef = useRef<{ roomId: string; username: string } | null>(null)
  const isLeavingRef = useRef(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const createSocketConnection = useCallback((room: string, username: string) => {
    const newSocket = io({
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setIsReconnecting(false)
      reconnectAttemptsRef.current = 0
      newSocket.emit('join-room', { roomId: room, username })
    })

    newSocket.on('reconnecting', (attempt) => {
      console.log(`Reconnecting attempt ${attempt}...`)
      setIsReconnecting(true)
      reconnectAttemptsRef.current = attempt
    })

    newSocket.on('reconnect_failed', () => {
      console.log('Reconnection failed')
      setIsReconnecting(false)
    })

    newSocket.on('error-message', (msg: string) => {
      alert(msg)
    })

    newSocket.on('joined', (data: RoomJoinedData) => {
      setRoomId(data.roomId)
      setCode(data.code)
      setUsers(data.users)
      setIsJoined(true)
      setCurrentUsername(data.username)

      const systemMessage: ChatMessage = {
        userId: 'system',
        username: '系统',
        message: `欢迎加入房间「${data.roomId}」`,
        timestamp: Date.now(),
      }
      setMessages((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].message !== systemMessage.message) {
          return [...prev, systemMessage]
        }
        return prev
      })

      setOfflineUsers(new Set())
    })

    newSocket.on('user-joined', (data: { userId: string; username: string; message: string }) => {
      const newMessage: ChatMessage = {
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, newMessage])
      setOfflineUsers((prev) => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
    })

    newSocket.on('user-offline', (data: { userId: string; username: string }) => {
      setOfflineUsers((prev) => {
        const next = new Set(prev)
        next.add(data.userId)
        return next
      })
    })

    newSocket.on('user-left', (data: { userId: string; username: string; message: string }) => {
      const newMessage: ChatMessage = {
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, newMessage])
      setOfflineUsers((prev) => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
    })

    newSocket.on('user-list', (userList: User[]) => {
      setUsers(userList)
    })

    newSocket.on('code-change', (data: { code: string; userId: string }) => {
      setCode(data.code)
    })

    newSocket.on('selection-change', (data: { selection: SelectionRange; userId: string }) => {
      // 远程选区变化可以在这里处理，例如显示其他用户的光标
      // 目前保留接口供未来扩展
      void data
    })

    newSocket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    newSocket.on('run-result', (result: RunResult) => {
      setRunResult(result)
      setIsRunning(false)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      if (isLeavingRef.current) {
        console.log('User intentionally left, no reconnection')
        isLeavingRef.current = false
        return
      }
      setIsReconnecting(true)
      users.forEach((u) => {
        if (u.id === newSocket.id) {
          setOfflineUsers((prev) => {
            const next = new Set(prev)
            next.add(u.id)
            return next
          })
        }
      })
    })

    setSocket(newSocket)
  }, [])

  const handleJoin = useCallback((room: string, username: string) => {
    savedRoomRef.current = { roomId: room, username }
    createSocketConnection(room, username)
  }, [createSocketConnection])

  const sendActivity = useCallback(() => {
    if (socket && isJoined) {
      socket.emit('user-activity', { roomId })
    }
  }, [socket, roomId, isJoined])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode)
      if (socket) {
        socket.emit('code-change', { roomId, code: newCode })
      }
      sendActivity()
    },
    [socket, roomId, sendActivity]
  )

  const handleSelectionChange = useCallback(
    (selection: SelectionRange) => {
      if (socket) {
        socket.emit('selection-change', { roomId, selection })
      }
      sendActivity()
    },
    [socket, roomId, sendActivity]
  )

  const handleSendMessage = useCallback(
    (message: string) => {
      if (socket && message.trim()) {
        socket.emit('chat-message', { roomId, message })
      }
      sendActivity()
    },
    [socket, roomId, sendActivity]
  )

  const handleRunCode = useCallback(() => {
    if (socket && !isRunning) {
      setIsRunning(true)
      socket.emit('run-code', { roomId, code })
    }
    sendActivity()
  }, [socket, roomId, code, isRunning, sendActivity])

  const handleClearOutput = useCallback(() => {
    setRunResult(null)
  }, [])

  const toggleChat = useCallback(() => {
    setIsChatExpanded((prev) => !prev)
  }, [])

  const handleLeaveRoom = useCallback(() => {
    if (socket && isJoined) {
      isLeavingRef.current = true
      socket.emit('leave-room', { roomId })
      socket.disconnect()
      setIsJoined(false)
      setSocket(null)
      setCode('')
      setUsers([])
      setMessages([])
      setRunResult(null)
      setOfflineUsers(new Set())
      setIsReconnecting(false)
      setIsChatExpanded(false)
    }
  }, [socket, roomId, isJoined])

  if (!isJoined) {
    return <JoinScreen onJoin={handleJoin} />
  }

  const ConnectionStatus = () => {
    if (isReconnecting) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
              animation: 'pulse 1.5s infinite',
            }}
          />
          重连中...
        </div>
      )
    }
    if (currentUsername) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
            }}
          />
          {currentUsername}
        </div>
      )
    }
    return null
  }

  const desktopLayout = (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        backgroundColor: '#1E1E2E',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ flex: '0 0 70%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            backgroundColor: '#2D2D3F',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #4B5563',
            flexShrink: 0,
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <h2
              style={{
                color: '#FFFFFF',
                fontSize: '16px',
                margin: 0,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '200px',
              }}
            >
              {roomId}
            </h2>
            <OnlineUsersList users={users} offlineUsers={offlineUsers} />
            <ConnectionStatus />
          </div>
          <RunButton
            onRun={handleRunCode}
            isRunning={isRunning}
            onClearOutput={handleClearOutput}
          />
          <button
            onClick={handleLeaveRoom}
            title="离开房间"
            style={{
              padding: '8px 14px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280'
            }}
          >
            退出
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              value={code}
              onChange={handleCodeChange}
              onSelectionChange={handleSelectionChange}
              onActivity={sendActivity}
            />
          </div>
          <OutputPanel output={runResult} />
        </div>
      </div>

      <div
        style={{
          flex: '0 0 30%',
          minWidth: '300px',
          maxWidth: '400px',
          borderLeft: '1px solid #4B5563',
        }}
      >
        <Chat messages={messages} onSendMessage={handleSendMessage} onlineCount={users.length} />
      </div>
    </div>
  )

  const mobileLayout = (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1E1E2E',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes chatSlideIn {
          from { height: 0; opacity: 0; }
          to { height: 200px; opacity: 1; }
        }
        @keyframes chatSlideOut {
          from { height: 200px; opacity: 1; }
          to { height: 0; opacity: 0; }
        }
        .mobile-chat-panel {
          overflow: hidden;
          transition: height 0.3s ease, opacity 0.3s ease;
        }
      `}</style>

      <div
        style={{
          backgroundColor: '#2D2D3F',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #4B5563',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <h2
            style={{
              color: '#FFFFFF',
              fontSize: '14px',
              margin: 0,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '80px',
            }}
          >
            {roomId}
          </h2>
          <OnlineUsersList users={users} offlineUsers={offlineUsers} />
          {isReconnecting && <ConnectionStatus />}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            style={{
              padding: '6px 12px',
              backgroundColor: isRunning ? '#6B7280' : '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
          >
            ▶
          </button>
          <button
            onClick={toggleChat}
            aria-label={isChatExpanded ? '收起聊天' : '展开聊天'}
            style={{
              padding: '6px 10px',
              backgroundColor: isChatExpanded ? '#60A5FA' : '#374151',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              position: 'relative',
            }}
          >
            💬
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isChatExpanded ? '#10B981' : '#60A5FA',
                border: '1px solid #2D2D3F',
              }}
            />
          </button>
          <button
            onClick={handleLeaveRoom}
            title="离开房间"
            style={{
              padding: '6px 10px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280'
            }}
          >
            退出
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              value={code}
              onChange={handleCodeChange}
              onSelectionChange={handleSelectionChange}
              onActivity={sendActivity}
            />
          </div>
          <OutputPanel output={runResult} />
        </div>

        <div
          className="mobile-chat-panel"
          style={{
            height: isChatExpanded ? '200px' : '0',
            opacity: isChatExpanded ? 1 : 0,
            flexShrink: 0,
            borderTop: isChatExpanded ? '1px solid #4B5563' : 'none',
          }}
        >
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            onlineCount={users.length}
            isMobileExpanded={isChatExpanded}
          />
        </div>
      </div>
    </div>
  )

  return isMobile ? mobileLayout : desktopLayout
}
