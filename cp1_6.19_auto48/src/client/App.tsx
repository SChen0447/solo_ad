import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore, getRandomNoteColor } from './store';
import Canvas from './canvas/Canvas';
import VotePanel from './vote/VotePanel';
import type { User, StickyNote, Vote, ClientToServerEvents, ServerToClientEvents } from '../types';
import { STYLES, SERVER, CANVAS } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export default function App() {
  const {
    room,
    currentUser,
    isMemberPanelCollapsed,
    activeVoteNoteId,
    setRoom,
    setCurrentUser,
    addNote,
    updateNote,
    deleteNote,
    addUser,
    removeUser,
    setUserSpeaking,
    updateVote,
    setVoteEnded,
    toggleMemberPanel,
    setActiveVoteNoteId,
  } = useAppStore();

  const [isConnected, setIsConnected] = useState(false);
  const [topic, setTopic] = useState('新项目头脑风暴');
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showMemberPanelMobile, setShowMemberPanelMobile] = useState(false);

  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const connectSocket = useCallback(() => {
    const socket: AppSocket = io({
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('user:joined', (user) => addUser(user));
    socket.on('user:left', (userId) => removeUser(userId));
    socket.on('user:speaking', (userId) => {
      setUserSpeaking(userId, true);
      setTimeout(() => setUserSpeaking(userId, false), 2000);
    });
    socket.on('note:created', (note) => addNote(note));
    socket.on('note:updated', (note) => updateNote(note));
    socket.on('note:deleted', (noteId) => deleteNote(noteId));
    socket.on('vote:cast', (vote) => updateVote(vote.noteId, vote));
    socket.on('vote:ended', () => setVoteEnded(true));
    socket.on('room:state', (roomState) => setRoom(roomState));

    socketRef.current = socket;
    return socket;
  }, [addUser, removeUser, setUserSpeaking, addNote, updateNote, deleteNote, updateVote, setVoteEnded, setRoom]);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) return;
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), duration: SERVER.DEFAULT_DURATION, nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (data.room && data.user) {
        const socket = connectSocket();
        setCurrentUser(data.user);
        setRoom(data.room);
        setRemainingTime(data.room.duration);
        socket.emit('room:join', { roomId: data.room.id, user: data.user });
      }
    } catch (e) {
      console.error('创建房间失败', e);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !joinCode.trim()) return;
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase(), nickname: nickname.trim() }),
      });
      if (!res.ok) {
        alert('房间不存在');
        return;
      }
      const data = await res.json();
      if (data.room && data.user) {
        const socket = connectSocket();
        setCurrentUser(data.user);
        setRoom(data.room);
        setRemainingTime(Math.max(0, data.room.duration - Math.floor((Date.now() - data.room.createdAt) / 1000)));
        socket.emit('room:join', { roomId: data.room.id, user: data.user });
      }
    } catch (e) {
      console.error('加入房间失败', e);
    }
  };

  useEffect(() => {
    if (!room) return;
    const timer = setInterval(() => {
      setRemainingTime((t) => {
        if (t <= 0) return 0;
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [room]);

  useEffect(() => {
    if (!room) return;
    const autoSave = setInterval(() => {
      console.log('Auto-save room state', room.id);
    }, CANVAS.AUTO_SAVE_INTERVAL);
    return () => clearInterval(autoSave);
  }, [room]);

  const createNote = (x: number, y: number) => {
    if (!room || !currentUser) return;
    const note: StickyNote = {
      id: uuidv4(),
      x,
      y,
      text: '',
      color: getRandomNoteColor(),
      creatorId: currentUser.id,
      createdAt: Date.now(),
    };
    addNote(note);
    socketRef.current?.emit('note:create', { roomId: room.id, note });
  };

  const onMoveNote = (note: StickyNote) => {
    if (!room) return;
    updateNote(note);
    socketRef.current?.emit('note:update', { roomId: room.id, note });
  };

  const onUpdateNote = (note: StickyNote) => {
    if (!room) return;
    updateNote(note);
    socketRef.current?.emit('note:update', { roomId: room.id, note });
  };

  const onDeleteNote = (noteId: string) => {
    if (!room) return;
    deleteNote(noteId);
    socketRef.current?.emit('note:delete', { roomId: room.id, noteId });
  };

  const onCastVote = (vote: Vote) => {
    if (!room) return;
    updateVote(vote.noteId, vote);
    socketRef.current?.emit('vote:cast', { roomId: room.id, vote });
  };

  const onEndVoting = () => {
    if (!room) return;
    socketRef.current?.emit('vote:end', room.id);
    setVoteEnded(true);
    useAppStore.getState().rearrangeNotes();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (!room || !currentUser) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: STYLES.BG_MAIN }}>
        <div
          style={{
            background: STYLES.BG_CARD,
            padding: 40,
            borderRadius: 16,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <h1 style={{ color: STYLES.TEXT_PRIMARY, marginBottom: 8, fontSize: 24, textAlign: 'center' }}>
            🧠 头脑风暴投票
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
            实时协作，创意无限
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#cbd5e1' }}>昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${STYLES.BORDER_DIVIDER}`,
                background: STYLES.BG_MAIN,
                color: STYLES.TEXT_PRIMARY,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#cbd5e1' }}>房间主题</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="头脑风暴主题"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${STYLES.BORDER_DIVIDER}`,
                background: STYLES.BG_MAIN,
                color: STYLES.TEXT_PRIMARY,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={!nickname.trim()}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              background: STYLES.BG_NAV,
              color: STYLES.TEXT_PRIMARY,
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: nickname.trim() ? 'pointer' : 'not-allowed',
              marginBottom: 16,
              opacity: nickname.trim() ? 1 : 0.5,
            }}
          >
            创建房间
          </button>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: STYLES.BORDER_DIVIDER }} />
            <span style={{ padding: '0 12px', color: '#94a3b8', fontSize: 12 }}>或加入已有房间</span>
            <div style={{ flex: 1, height: 1, background: STYLES.BORDER_DIVIDER }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#cbd5e1' }}>房间码</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="输入6位房间码"
              maxLength={6}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${STYLES.BORDER_DIVIDER}`,
                background: STYLES.BG_MAIN,
                color: STYLES.TEXT_PRIMARY,
                fontSize: 16,
                letterSpacing: 4,
                textAlign: 'center',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={!nickname.trim() || !joinCode.trim()}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              background: 'transparent',
              color: STYLES.TEXT_PRIMARY,
              border: `1px solid ${STYLES.BG_NAV}`,
              fontSize: 15,
              fontWeight: 600,
              cursor: nickname.trim() && joinCode.trim() ? 'pointer' : 'not-allowed',
              opacity: nickname.trim() && joinCode.trim() ? 1 : 0.5,
            }}
          >
            加入房间
          </button>
        </div>
      </div>
    );
  }

  const isCreator = room.creatorId === currentUser.id;

  const memberPanel = (
    <div
      style={{
        width: STYLES.MEMBER_PANEL_WIDTH,
        background: STYLES.BG_CARD,
        borderRight: `1px solid ${STYLES.BORDER_DIVIDER}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 14, color: STYLES.TEXT_PRIMARY, fontWeight: 600 }}>
          成员 ({room.users.length})
        </h3>
        {isMobile && (
          <button
            onClick={() => setShowMemberPanelMobile(false)}
            style={{ background: 'none', border: 'none', color: STYLES.TEXT_PRIMARY, cursor: 'pointer', fontSize: 18 }}
          >
            ✕
          </button>
        )}
      </div>
      {room.users.map((user: User) => (
        <div
          key={user.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 8,
            borderRadius: 8,
            background: user.id === currentUser.id ? 'rgba(15, 52, 96, 0.5)' : 'transparent',
          }}
        >
          <div
            className={user.isSpeaking ? 'golden-border' : ''}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: user.avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a1a2e',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
              border: user.isSpeaking ? '2px solid #ffd700' : 'none',
            }}
          >
            {user.nickname.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: STYLES.TEXT_PRIMARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.nickname}
              {user.isCreator && <span style={{ color: '#ffd700', marginLeft: 4 }}>👑</span>}
              {user.id === currentUser.id && <span style={{ color: '#94a3b8', marginLeft: 4, fontSize: 11 }}>(我)</span>}
            </div>
            {user.isSpeaking && (
              <div style={{ fontSize: 11, color: '#ffd700' }}>发言中...</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: STYLES.BG_MAIN }}>
      <div
        style={{
          height: STYLES.NAV_HEIGHT,
          background: STYLES.BG_NAV,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          padding: '0 16px',
        }}
      >
        {isMobile && (
          <button
            onClick={() => setShowMemberPanelMobile(true)}
            style={{
              position: 'absolute',
              left: 16,
              background: 'none',
              border: 'none',
              color: STYLES.TEXT_PRIMARY,
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ☰
          </button>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', letterSpacing: 4 }}>房间码</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STYLES.TEXT_PRIMARY, letterSpacing: 6 }}>
            {room.code}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>剩余时间</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: remainingTime < 300 ? '#ff6b6b' : STYLES.TEXT_PRIMARY, fontFamily: 'monospace' }}>
              {formatTime(remainingTime)}
            </div>
          </div>
          {isCreator && !room.voteEnded && (
            <button
              onClick={onEndVoting}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#27ae60',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              结束投票
            </button>
          )}
          {!isMobile && (
            <button
              onClick={toggleMemberPanel}
              style={{
                background: 'none',
                border: 'none',
                color: STYLES.TEXT_PRIMARY,
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              {isMemberPanelCollapsed ? '◀' : '▶'}
            </button>
          )}
          <div style={{ fontSize: 11, color: isConnected ? '#27ae60' : '#e74c3c' }}>
            {isConnected ? '● 已连接' : '○ 断开'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {!isMobile && !isMemberPanelCollapsed && memberPanel}

        {isMobile && showMemberPanelMobile && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: 240,
              zIndex: 100,
              background: STYLES.BG_CARD,
              boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
            }}
          >
            {memberPanel}
          </div>
        )}
        {isMobile && showMemberPanelMobile && (
          <div
            onClick={() => setShowMemberPanelMobile(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 240,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 99,
            }}
          />
        )}

        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            notes={room.notes}
            onCreateNote={createNote}
            onMoveNote={onMoveNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            currentUser={currentUser}
            onLongPressNote={(noteId) => setActiveVoteNoteId(noteId)}
            voteEnded={!!room.voteEnded}
          />
          {activeVoteNoteId && (
            <VotePanel
              noteId={activeVoteNoteId}
              currentUser={currentUser}
              onVote={onCastVote}
              onClose={() => setActiveVoteNoteId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
