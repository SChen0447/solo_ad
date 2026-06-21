import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from './Editor'
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

function UserAvatar({ username, color, size = 32 }: { username: string; color: string; size?: number }) {
  const initial = username.charAt(0).toUpperCase()
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.45}px`,
        fontWeight: 600,
        flexShrink: 0,
      }}
      title={username}
    >
      {initial}
    </div>
  )
}

function OnlineUsersList({ users }: { users: User[] }) {
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
              <UserAvatar username={user.username} color={user.color} />
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
  const [code, setCode] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleJoin = useCallback((room: string, username: string) => {
    const newSocket = io()

    newSocket.on('connect', () => {
      console.log('Connected to server')
      newSocket.emit('join-room', { roomId: room, username })
    })

    newSocket.on('error-message', (msg: string) => {
      alert(msg)
    })

    newSocket.on('joined', (data: RoomJoinedData) => {
      setRoomId(data.roomId)
      setCode(data.code)
      setUsers(data.users)
      setIsJoined(true)

      const systemMessage: ChatMessage = {
        userId: 'system',
        username: '系统',
        message: `欢迎加入房间「${data.roomId}」`,
        timestamp: Date.now(),
      }
      setMessages([systemMessage])
    })

    newSocket.on('user-joined', (data: { userId: string; username: string; message: string }) => {
      const newMessage: ChatMessage = {
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, newMessage])
    })

    newSocket.on('user-left', (data: { userId: string; username: string; message: string }) => {
      const newMessage: ChatMessage = {
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, newMessage])
    })

    newSocket.on('user-list', (userList: User[]) => {
      setUsers(userList)
    })

    newSocket.on('code-change', (data: { code: string; userId: string }) => {
      setCode(data.code)
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
    })

    setSocket(newSocket)
  }, [])

  const sendActivity = useCallback(() => {
    if (socket && isJoined) {
      socket.emit('user-activity', { roomId })

      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current)
      }
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

  const toggleChat = () => {
    setIsChatExpanded(!isChatExpanded)
  }

  if (!isJoined) {
    return <JoinScreen onJoin={handleJoin} />
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ color: '#FFFFFF', fontSize: '16px', margin: 0, fontWeight: 600 }}>
              {roomId}
            </h2>
            <OnlineUsersList users={users} />
          </div>
          <RunButton
            onRun={handleRunCode}
            isRunning={isRunning}
            onClearOutput={handleClearOutput}
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor value={code} onChange={handleCodeChange} onActivity={sendActivity} />
          </div>
          <OutputPanel output={runResult} />
        </div>
      </div>

      <div style={{ flex: '0 0 30%', minWidth: '300px', borderLeft: '1px solid #4B5563' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <h2
            style={{
              color: '#FFFFFF',
              fontSize: '14px',
              margin: 0,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '120px',
            }}
          >
            {roomId}
          </h2>
          <OnlineUsersList users={users} />
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
            }}
          >
            ▶
          </button>
          <button
            onClick={toggleChat}
            style={{
              padding: '6px 10px',
              backgroundColor: isChatExpanded ? '#60A5FA' : '#374151',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            💬
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor value={code} onChange={handleCodeChange} onActivity={sendActivity} />
          </div>
          <OutputPanel output={runResult} />
        </div>

        <div
          style={{
            height: isChatExpanded ? '200px' : '0',
            transition: 'height 0.3s ease',
            overflow: 'hidden',
            borderTop: isChatExpanded ? '1px solid #4B5563' : 'none',
            flexShrink: 0,
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
