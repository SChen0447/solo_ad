import { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import Whiteboard from './components/Whiteboard';
import TodoList from './components/TodoList';
import FileUpload from './components/FileUpload';

interface User {
  id: string;
  nickname: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploader: string;
  createdAt: number;
}

const ANIMALS = [
  '🦅游隼', '🦊狐狸', '🐺灰狼', '🦉猫头鹰', '🐻棕熊',
  '🦁狮子', '🐯老虎', '🐆猎豹', '🦝浣熊', '🦡獾',
  '🐿️松鼠', '🦔刺猬', '🐇兔子', '🦌鹿', '🦬野牛',
];

function generateNickname(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${animal}#${num}`;
}

function JoinRoom({ onJoin }: { onJoin: (nickname: string, roomCode: string) => void }) {
  const [nickname, setNickname] = useState(generateNickname());
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(nickname.trim() || generateNickname(), roomCode.trim().toUpperCase());
  };

  return (
    <div style={styles.joinContainer}>
      <div style={styles.joinCard}>
        <h1 style={styles.joinTitle}>临时协作空间</h1>
        <p style={styles.joinSubtitle}>24小时后自动清除，快速协作不留痕</p>
        <form onSubmit={handleSubmit} style={styles.joinForm}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>昵称</label>
            <div style={styles.inputWrapper}>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入昵称"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setNickname(generateNickname())}
                style={styles.iconBtn}
              >
                🎲
              </button>
            </div>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>房间码</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="留空自动生成"
              maxLength={6}
              style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '2px' }}
            />
          </div>
          <button type="submit" style={styles.primaryBtn}>
            {roomCode ? '加入房间' : '创建房间'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RoomView({
  nickname,
  initialRoomCode,
}: {
  nickname: string;
  initialRoomCode: string;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [users, setUsers] = useState<User[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [copyTip, setCopyTip] = useState(false);

  useEffect(() => {
    const s = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      s.emit('room:join', { roomCode: initialRoomCode, nickname });
    });

    s.on('room:joined', (data: { roomCode: string; todos: TodoItem[]; files: FileItem[] }) => {
      setRoomCode(data.roomCode);
      setTodos(data.todos);
      setFiles(data.files);
    });

    s.on('room:users', (userList: User[]) => {
      setUsers(userList);
    });

    s.on('todo:added', (todo: TodoItem) => {
      setTodos((prev) => [...prev, todo]);
    });

    s.on('todo:toggled', ({ todoId, completed }: { todoId: string; completed: boolean }) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, completed } : t))
      );
    });

    s.on('todo:deleted', (todoId: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== todoId));
    });

    s.on('file:added', (file: FileItem) => {
      setFiles((prev) => [...prev, file]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [initialRoomCode, nickname]);

  const userCountColor = useMemo(() => {
    const n = users.length;
    if (n <= 3) return '#888';
    if (n <= 10) return '#ff9800';
    return '#4caf50';
  }, [users.length]);

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopyTip(true);
      setTimeout(() => setCopyTip(false), 1500);
    });
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div style={styles.roomContainer}>
      <div style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.roomCodeLabel}>房间码：</span>
          <span style={styles.roomCodeText}>{roomCode}</span>
          <button onClick={handleCopyRoomCode} style={styles.copyBtn}>
            📋
          </button>
          {copyTip && <span style={styles.copyTip}>已复制!</span>}
        </div>
        <div style={styles.navRight}>
          <span style={{ ...styles.onlineCount, color: userCountColor }}>
            <span className="pulse-dot" style={styles.pulseDot}></span>
            {users.length} 人在线
          </span>
          <span style={styles.myNickname}>我: {nickname}</span>
        </div>
      </div>

      <div className="main-content" style={styles.mainContent}>
        <div className="left-area" style={styles.leftArea}>
          {socket && (
            <Whiteboard socket={socket} roomCode={roomCode} nickname={nickname} />
          )}
          {socket && (
            <FileUpload
              socket={socket}
              roomCode={roomCode}
              nickname={nickname}
              files={files}
            />
          )}
        </div>
        <div className="right-panel" style={styles.rightPanel}>
          {socket && (
            <TodoList
              socket={socket}
              roomCode={roomCode}
              todos={todos}
              completedCount={completedCount}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .pulse-dot {
          animation: pulse 1.2s ease-in-out infinite;
        }
        @media (max-width: 900px) {
          .main-content {
            flex-direction: column !important;
          }
          .left-area {
            width: 100% !important;
          }
          .right-panel {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const handleJoin = (nick: string, code: string) => {
    setNickname(nick);
    setRoomCode(code);
    if (!code) {
      window.history.pushState({}, '', '/room/new');
    } else {
      window.history.pushState({}, '', `/room/${code}`);
    }
  };

  if (nickname && roomCode !== null) {
    return <RoomView nickname={nickname} initialRoomCode={roomCode} />;
  }

  return <JoinRoom onJoin={handleJoin} />;
}

const styles: Record<string, React.CSSProperties> = {
  joinContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1b2e 0%, #2a1b3e 100%)',
  },
  joinCard: {
    backgroundColor: '#252640',
    padding: '48px 40px',
    borderRadius: '16px',
    width: '380px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  joinTitle: {
    color: '#fff',
    fontSize: '28px',
    margin: 0,
    marginBottom: '8px',
    textAlign: 'center',
  },
  joinSubtitle: {
    color: '#8888aa',
    fontSize: '14px',
    margin: 0,
    marginBottom: '32px',
    textAlign: 'center',
  },
  joinForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#aaaacc',
    fontSize: '13px',
    fontWeight: 500,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #3a3b5e',
    backgroundColor: '#1e1f35',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  iconBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  primaryBtn: {
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #5b6cff 0%, #7b4cff 100%)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'filter 0.2s, transform 0.2s',
  },
  roomContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1b2e',
  },
  navbar: {
    height: '60px',
    background: 'linear-gradient(90deg, #2a2b4e 0%, #3c2e5e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roomCodeLabel: {
    color: '#aaaacc',
    fontSize: '13px',
  },
  roomCodeText: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    letterSpacing: '2px',
    fontFamily: 'monospace',
  },
  copyBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'filter 0.2s, transform 0.2s',
  },
  copyTip: {
    color: '#4caf50',
    fontSize: '13px',
    marginLeft: '8px',
    animation: 'fadeInOut 1.5s ease',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  onlineCount: {
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    display: 'inline-block',
  },
  myNickname: {
    color: '#ccccee',
    fontSize: '13px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    gap: '16px',
    padding: '16px',
    overflow: 'hidden',
  },
  leftArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
  },
  rightPanel: {
    width: '300px',
    flexShrink: 0,
  },
};
