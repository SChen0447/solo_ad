import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import MaterialBoard from './MaterialBoard'
import TaskBoard from './TaskBoard'
import ChatPanel from './ChatPanel'

interface Material {
  id: string
  name: string
  category: string
  total: number
  allocated: number
  available: number
  image?: string
}

interface Task {
  id: string
  title: string
  description: string
  area: string
  type: string
  requiredPeople: number
  currentPeople: number
  deadline: string
  status: 'pending' | 'in_progress' | 'completed'
  progress: 'pending' | 'en_route' | 'arrived' | 'completed'
  volunteers: string[]
}

interface ChatMessage {
  id: string
  taskId: string
  userId: string
  userName: string
  avatar: string
  content: string
  type: 'text' | 'emoji'
  timestamp: number
}

type ViewType = 'materials' | 'tasks'

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentView, setCurrentView] = useState<ViewType>('tasks')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [currentUser] = useState({ id: 'current', name: '我', avatar: '😊' })

  useEffect(() => {
    const newSocket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
    })

    newSocket.on('materials:initial', (data: Material[]) => {
      setMaterials(data)
    })

    newSocket.on('material:update', (data: Material[]) => {
      setMaterials(data)
    })

    newSocket.on('tasks:initial', (data: Task[]) => {
      setTasks(data)
    })

    newSocket.on('task:update', (data: Task[]) => {
      setTasks(data)
    })

    newSocket.on('chat:newMessage', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  useEffect(() => {
    if (selectedTaskId) {
      fetch(`/api/tasks/${selectedTaskId}/messages`)
        .then((res) => res.json())
        .then((data: ChatMessage[]) => {
          setChatMessages(data)
        })
        .catch((err) => console.error('Failed to fetch messages:', err))
    }
  }, [selectedTaskId])

  const handleClaimTask = useCallback(
    (taskId: string) => {
      if (socket) {
        socket.emit('task:claim', { taskId, userId: currentUser.id })
      }
    },
    [socket, currentUser.id]
  )

  const handleUpdateProgress = useCallback(
    (taskId: string, progress: Task['progress']) => {
      if (socket) {
        socket.emit('task:progress', { taskId, progress })
      }
    },
    [socket]
  )

  const handleSendMessage = useCallback(
    (taskId: string, content: string, type: 'text' | 'emoji') => {
      if (socket) {
        socket.emit('chat:message', { taskId, content, type })
      }
    },
    [socket]
  )

  const handleOpenChat = (taskId: string) => {
    setSelectedTaskId(taskId)
    setIsChatOpen(true)
  }

  const handleCloseChat = () => {
    setIsChatOpen(false)
  }

  const getTaskMessages = (taskId: string) => {
    return chatMessages
      .filter((m) => m.taskId === taskId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🧡</span>
            <h1 style={styles.title}>志愿者物资调度平台</h1>
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userAvatar}>{currentUser.avatar}</span>
            <span style={styles.userName}>{currentUser.name}</span>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        <button
          style={{
            ...styles.navButton,
            ...(currentView === 'materials' ? styles.navButtonActive : {}),
          }}
          onClick={() => setCurrentView('materials')}
        >
          📦 物资看板
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(currentView === 'tasks' ? styles.navButtonActive : {}),
          }}
          onClick={() => setCurrentView('tasks')}
        >
          📋 任务板
        </button>
      </nav>

      <main style={styles.main}>
        {currentView === 'materials' && <MaterialBoard materials={materials} socket={socket} />}
        {currentView === 'tasks' && (
          <TaskBoard
            tasks={tasks}
            currentUserId={currentUser.id}
            onClaimTask={handleClaimTask}
            onUpdateProgress={handleUpdateProgress}
            onOpenChat={handleOpenChat}
            getTaskMessages={getTaskMessages}
          />
        )}
      </main>

      {isChatOpen && selectedTaskId && (
        <ChatPanel
          taskId={selectedTaskId}
          messages={chatMessages.filter((m) => m.taskId === selectedTaskId)}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onClose={handleCloseChat}
          taskTitle={tasks.find((t) => t.id === selectedTaskId)?.title || ''}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, rgba(255,140,66,0.95) 0%, rgba(255,209,102,0.95) 100%)',
    backdropFilter: 'blur(12px)',
    padding: '16px 24px',
    boxShadow: '0 2px 16px rgba(255,140,66,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.25)',
    padding: '8px 16px',
    borderRadius: '20px',
  },
  userAvatar: {
    fontSize: '24px',
  },
  userName: {
    color: '#fff',
    fontWeight: 500,
    fontSize: '14px',
  },
  nav: {
    display: 'flex',
    gap: '8px',
    padding: '16px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  navButton: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.6)',
    color: '#6B6B6B',
    border: '1px solid rgba(255,140,66,0.2)',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(255,140,66,0.4)',
  },
  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '0 24px 24px',
  },
}

export default App
