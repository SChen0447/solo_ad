import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import { User, Room, Note, TRACK_COLORS, INSTRUMENT_ROLES, InstrumentType } from './types';

interface AppContextType {
  currentUser: User | null;
  currentRoom: Room | null;
  socket: Socket | null;
  createRoom: (name: string, userName: string) => Promise<void>;
  joinRoom: (code: string, userName: string) => Promise<void>;
  leaveRoom: () => void;
  loadSharedProject: (shareCode: string) => Promise<void>;
  notes: { [key: string]: boolean };
  setNote: (track: number, step: number, userId: string) => void;
  removeNote: (track: number, step: number) => void;
  remoteEdits: { [key: string]: { color: string; timestamp: number } };
  bpm: number;
  setBpm: (bpm: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const AppContent = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: boolean }>({});
  const [remoteEdits, setRemoteEdits] = useState<{ [key: string]: { color: string; timestamp: number } }>({});
  const [bpm, setBpm] = useState(120);

  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const createRoom = useCallback(async (name: string, userName: string) => {
    try {
      const response = await axios.post('/api/rooms', { name });
      const { room } = response.data;
      
      const newSocket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
      
      const userColor = TRACK_COLORS[0];
      const instrumentType: InstrumentType = 'piano';
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: userName,
        color: userColor,
        role: INSTRUMENT_ROLES[instrumentType]
      };
      
      setCurrentUser(user);
      setSocket(newSocket);
      setCurrentRoom(room);
      setNotes(room.notes || {});
      setBpm(room.bpm || 120);
      
      newSocket.emit('join-room', { roomId: room.id, user });
      
      newSocket.on('user-joined', (data: { user: User; users: User[] }) => {
        setCurrentRoom(prev => prev ? { ...prev, users: data.users } : null);
      });
      
      newSocket.on('user-left', (data: { users: User[] }) => {
        setCurrentRoom(prev => prev ? { ...prev, users: data.users } : null);
      });
      
      newSocket.on('note-added', (data: { track: number; step: number; userId: string; color: string }) => {
        const key = `${data.track}-${data.step}`;
        setNotes(prev => ({ ...prev, [key]: true }));
        setRemoteEdits(prev => ({ ...prev, [key]: { color: data.color, timestamp: Date.now() } }));
        setTimeout(() => {
          setRemoteEdits(prev => {
            const newEdits = { ...prev };
            delete newEdits[key];
            return newEdits;
          });
        }, 300);
      });
      
      newSocket.on('note-removed', (data: { track: number; step: number; userId: string; color: string }) => {
        const key = `${data.track}-${data.step}`;
        setNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[key];
          return newNotes;
        });
        setRemoteEdits(prev => ({ ...prev, [key]: { color: data.color, timestamp: Date.now() } }));
        setTimeout(() => {
          setRemoteEdits(prev => {
            const newEdits = { ...prev };
            delete newEdits[key];
            return newEdits;
          });
        }, 300);
      });
      
      navigate(`/room/${room.code}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('创建房间失败，请稍后重试');
    }
  }, [navigate]);

  const joinRoom = useCallback(async (code: string, userName: string) => {
    try {
      const response = await axios.get(`/api/rooms/${code}`);
      const { room } = response.data;
      
      if (room.users.length >= room.maxUsers) {
        alert('房间已满');
        return;
      }
      
      const newSocket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
      
      const userIndex = room.users.length;
      const userColor = TRACK_COLORS[userIndex];
      const instrumentTypes: InstrumentType[] = ['piano', 'drum', 'bass', 'lead'];
      const instrumentType = instrumentTypes[userIndex % 4];
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: userName,
        color: userColor,
        role: INSTRUMENT_ROLES[instrumentType]
      };
      
      setCurrentUser(user);
      setSocket(newSocket);
      setCurrentRoom(room);
      setNotes(room.notes || {});
      setBpm(room.bpm || 120);
      
      newSocket.emit('join-room', { roomId: room.id, user });
      
      newSocket.on('user-joined', (data: { user: User; users: User[] }) => {
        setCurrentRoom(prev => prev ? { ...prev, users: data.users } : null);
      });
      
      newSocket.on('user-left', (data: { users: User[] }) => {
        setCurrentRoom(prev => prev ? { ...prev, users: data.users } : null);
      });
      
      newSocket.on('note-added', (data: { track: number; step: number; userId: string; color: string }) => {
        const key = `${data.track}-${data.step}`;
        setNotes(prev => ({ ...prev, [key]: true }));
        setRemoteEdits(prev => ({ ...prev, [key]: { color: data.color, timestamp: Date.now() } }));
        setTimeout(() => {
          setRemoteEdits(prev => {
            const newEdits = { ...prev };
            delete newEdits[key];
            return newEdits;
          });
        }, 300);
      });
      
      newSocket.on('note-removed', (data: { track: number; step: number; userId: string; color: string }) => {
        const key = `${data.track}-${data.step}`;
        setNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[key];
          return newNotes;
        });
        setRemoteEdits(prev => ({ ...prev, [key]: { color: data.color, timestamp: Date.now() } }));
        setTimeout(() => {
          setRemoteEdits(prev => {
            const newEdits = { ...prev };
            delete newEdits[key];
            return newEdits;
          });
        }, 300);
      });
      
      navigate(`/room/${code}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('加入房间失败，请检查房间码是否正确');
    }
  }, [navigate]);

  const leaveRoom = useCallback(() => {
    if (socket && currentRoom && currentUser) {
      socket.emit('leave-room', { roomId: currentRoom.id, user: currentUser });
      socket.disconnect();
    }
    setCurrentUser(null);
    setCurrentRoom(null);
    setSocket(null);
    setNotes({});
    setRemoteEdits({});
    navigate('/');
  }, [socket, currentRoom, currentUser, navigate]);

  const loadSharedProject = useCallback(async (shareCode: string) => {
    try {
      const response = await axios.get(`/api/share/${shareCode}`);
      const { project, audioUrl } = response.data;
      setNotes(project.notes || {});
      setBpm(project.bpm || 120);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('Failed to load shared project:', error);
      alert('加载分享项目失败');
    }
  }, []);

  const setNote = useCallback((track: number, step: number, userId: string) => {
    const key = `${track}-${step}`;
    setNotes(prev => ({ ...prev, [key]: true }));
    if (socket && currentRoom && currentUser) {
      socket.emit('add-note', { roomId: currentRoom.id, track, step, userId, color: currentUser.color });
    }
  }, [socket, currentRoom, currentUser]);

  const removeNote = useCallback((track: number, step: number) => {
    const key = `${track}-${step}`;
    setNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[key];
      return newNotes;
    });
    if (socket && currentRoom && currentUser) {
      socket.emit('remove-note', { roomId: currentRoom.id, track, step, userId: currentUser.id, color: currentUser.color });
    }
  }, [socket, currentRoom, currentUser]);

  const value: AppContextType = {
    currentUser,
    currentRoom,
    socket,
    createRoom,
    joinRoom,
    leaveRoom,
    loadSharedProject,
    notes,
    setNote,
    removeNote,
    remoteEdits,
    bpm,
    setBpm
  };

  return (
    <AppContext.Provider value={value}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:code" element={<CreatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppContext.Provider>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
