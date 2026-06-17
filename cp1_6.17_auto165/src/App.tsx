import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { File, Edit, Eye, Play, Share, Users, History, Music, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from './store';
import { Note, Score, Version, User, EditType } from './types';
import ScoreEditor from './ScoreEditor';
import CollaborationPanel from './CollaborationPanel';

const ROOM_ID = 'default-room';

export default function App() {
  const {
    currentUser,
    users,
    score,
    versions,
    isPlaying,
    playbackSpeed,
    isMobile,
    isRightPanelOpen,
    setUsers,
    addUser,
    removeUser,
    setScore,
    updateNote,
    setVersions,
    addVersion,
    setCursor,
    setIsPlaying,
    setPlaybackSpeed,
    setIsMobile,
    setIsRightPanelOpen,
  } = useAppStore();

  const socketRef = useRef<Socket | null>(null);
  const timeSignatureRef = useRef(score?.timeSignature || '4/4');
  const keySignatureRef = useRef(score?.keySignature || 'C大调');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsRightPanelOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile, setIsRightPanelOpen]);

  useEffect(() => {
    if (score) {
      timeSignatureRef.current = score.timeSignature;
      keySignatureRef.current = score.keySignature;
    }
  }, [score]);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const response = await axios.get<Score>('/api/scores/demo-score-1');
        setScore(response.data);
        timeSignatureRef.current = response.data.timeSignature;
        keySignatureRef.current = response.data.keySignature;
      } catch (error) {
        console.error('Failed to fetch score:', error);
      }
    };

    const fetchVersions = async () => {
      try {
        const response = await axios.get<Version[]>('/api/scores/demo-score-1/versions');
        setVersions(response.data);
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      }
    };

    fetchScore();
    fetchVersions();

    const socket = io({
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('join_room', { roomId: ROOM_ID, user: currentUser });
    });

    socket.on('user_joined', (data: { user: User; users: User[] }) => {
      setUsers(data.users);
    });

    socket.on('user_left', (data: { userId: string; users: User[] }) => {
      removeUser(data.userId);
      setUsers(data.users);
    });

    socket.on('note_edited', (data: { type: EditType; note: Note; userId: string }) => {
      if (data.userId !== currentUser.id) {
        updateNote(data.type, data.note);
      }
    });

    socket.on('cursor_updated', (data: { userId: string; x: number; y: number }) => {
      if (data.userId !== currentUser.id) {
        setCursor(data.userId, data.x, data.y);
      }
    });

    socket.on('rollback_done', (data: { snapshot: Score; versionId: string }) => {
      setScore(data.snapshot);
      timeSignatureRef.current = data.snapshot.timeSignature;
      keySignatureRef.current = data.snapshot.keySignature;
    });

    socket.on('version_added', (data: { version: Version }) => {
      addVersion(data.version);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser.id, setScore, setVersions, setUsers, addUser, removeUser, updateNote, setCursor, addVersion]);

  const handleNoteEdit = useCallback((type: EditType, note: Note) => {
    updateNote(type, note);
    if (socketRef.current) {
      socketRef.current.emit('edit_note', {
        roomId: ROOM_ID,
        type,
        note,
        userId: currentUser.id,
      });
    }
  }, [updateNote, currentUser.id]);

  const handleCursorMove = useCallback((x: number, y: number) => {
    if (socketRef.current) {
      socketRef.current.emit('cursor_move', {
        roomId: ROOM_ID,
        userId: currentUser.id,
        x,
        y,
      });
    }
  }, [currentUser.id]);

  const handleRollback = useCallback((versionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('rollback', {
        roomId: ROOM_ID,
        versionId,
        userId: currentUser.id,
      });
    }
  }, [currentUser.id]);

  const handleTimeSignatureChange = useCallback((timeSignature: string) => {
    if (score) {
      const updatedScore = { ...score, timeSignature };
      setScore(updatedScore);
      timeSignatureRef.current = timeSignature;
      axios.put(`/api/scores/${score.id}`, { timeSignature });
    }
  }, [score, setScore]);

  const handleKeySignatureChange = useCallback((keySignature: string) => {
    if (score) {
      const updatedScore = { ...score, keySignature };
      setScore(updatedScore);
      keySignatureRef.current = keySignature;
      axios.put(`/api/scores/${score.id}`, { keySignature });
    }
  }, [score, setScore]);

  const handlePlaybackSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, [setPlaybackSpeed]);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const onlineCount = users.length + 1;

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Music className="w-6 h-6 text-[var(--accent-primary)]" />
          <h1 className="text-lg font-bold">协作乐谱编辑器</h1>
        </div>
        <nav className="flex items-center gap-2">
          <button className="flex items-center gap-1">
            <File className="w-4 h-4" />
            <span>文件</span>
          </button>
          <button className="flex items-center gap-1">
            <Edit className="w-4 h-4" />
            <span>编辑</span>
          </button>
          <button className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>视图</span>
          </button>
          <button
            onClick={handlePlayToggle}
            className={`flex items-center gap-1 ${isPlaying ? 'bg-[var(--accent-primary)]' : ''}`}
          >
            <Play className="w-4 h-4" />
            <span>{isPlaying ? '暂停' : '播放'}</span>
          </button>
          <button className="flex items-center gap-1">
            <Share className="w-4 h-4" />
            <span>共享</span>
          </button>
          <select
            value={timeSignatureRef.current}
            onChange={(e) => handleTimeSignatureChange(e.target.value)}
            className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm"
          >
            <option value="4/4">4/4拍</option>
            <option value="3/4">3/4拍</option>
            <option value="6/8">6/8拍</option>
          </select>
          <select
            value={keySignatureRef.current}
            onChange={(e) => handleKeySignatureChange(e.target.value)}
            className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm"
          >
            <option value="C大调">C大调</option>
            <option value="G大调">G大调</option>
            <option value="D大调">D大调</option>
            <option value="A小调">A小调</option>
            <option value="E小调">E小调</option>
            <option value="B小调">B小调</option>
          </select>
          <select
            value={playbackSpeed}
            onChange={(e) => handlePlaybackSpeedChange(Number(e.target.value))}
            className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </nav>
        {isMobile && (
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            {isRightPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {score && (
            <ScoreEditor
              score={score}
              onNoteEdit={handleNoteEdit}
              onCursorMove={handleCursorMove}
              currentUser={currentUser}
            />
          )}
        </main>

        {(!isMobile || isRightPanelOpen) && (
          <CollaborationPanel
            users={users}
            currentUser={currentUser}
            versions={versions}
            onRollback={handleRollback}
            isMobile={isMobile}
          />
        )}
      </div>

      <footer className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-sm">
        <div className="flex items-center gap-4">
          <span>节拍: {timeSignatureRef.current}</span>
          <span>调号: {keySignatureRef.current}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
          <span>在线: {onlineCount} 人</span>
        </div>
      </footer>
    </div>
  );
}
