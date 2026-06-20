import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionData, Topic, HistoryEntry, AppView, VoteType, PaceChange } from './types';
import { VoteBoard } from './voteBoard';
import { SpeakerControls } from './speakerControls';
import { VoteHistory } from './voteHistory';

const SocketContext = createContext<Socket | null>(null);
export const useSocket = () => useContext(SocketContext);

const SessionContext = createContext<{
  session: SessionData | null;
  isSpeaker: boolean;
  voterId: string;
  roomCode: string;
  currentTopic: Topic | null;
  history: HistoryEntry[];
  paceBanner: PaceChange | null;
  audienceCount: number;
  topics: Topic[];
  setCurrentTopic: (t: Topic) => void;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}>({
  session: null,
  isSpeaker: false,
  voterId: '',
  roomCode: '',
  currentTopic: null,
  history: [],
  paceBanner: null,
  audienceCount: 0,
  topics: [],
  setCurrentTopic: () => {},
  setHistory: () => {},
});

export const useSession = () => useContext(SessionContext);

export default function App() {
  const [view, setView] = useState<AppView>('create');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [voterId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [roomCode, setRoomCode] = useState('');
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [paceBanner, setPaceBanner] = useState<PaceChange | null>(null);
  const [audienceCount, setAudienceCount] = useState(0);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createTopics, setCreateTopics] = useState(['', '', '']);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectSocket = useCallback(() => {
    const s = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    return s;
  }, []);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('vote_updated', (data: { topic_id: string; votes: Topic['votes']; total: number; voter_choice: VoteType; voter_id: string }) => {
      setCurrentTopic(prev => {
        if (!prev) return prev;
        if (prev.id === data.topic_id) {
          return { ...prev, votes: data.votes };
        }
        return prev;
      });
      setTopics(prev => prev.map(t => t.id === data.topic_id ? { ...t, votes: data.votes } : t));
    });

    socket.on('topic_changed', (data: { current_topic: Topic; current_topic_index: number; topics: Topic[] }) => {
      setCurrentTopic(data.current_topic);
      setTopics(data.topics);
    });

    socket.on('history_update', (data: { history: HistoryEntry[] }) => {
      setHistory(data.history);
    });

    socket.on('pace_change', (data: PaceChange) => {
      setPaceBanner(data);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => {
        setPaceBanner(null);
      }, 5000);
    });

    socket.on('time_adjusted', (data: { topic_id: string; duration: number }) => {
      setCurrentTopic(prev => {
        if (!prev) return prev;
        if (prev.id === data.topic_id) {
          return { ...prev, suggested_duration: data.duration };
        }
        return prev;
      });
      setTopics(prev => prev.map(t => t.id === data.topic_id ? { ...t, suggested_duration: data.duration } : t));
    });

    socket.on('audience_count_update', (data: { audience_count: number }) => {
      setAudienceCount(data.audience_count);
    });

    socket.on('session_ended', () => {
      setError('所有话题已完成');
    });

    return () => {
      socket.off('vote_updated');
      socket.off('topic_changed');
      socket.off('history_update');
      socket.off('pace_change');
      socket.off('time_adjusted');
      socket.off('audience_count_update');
      socket.off('session_ended');
    };
  }, [socket]);

  const handleCreate = async () => {
    setError('');
    if (!createTitle.trim()) {
      setError('请输入分享会标题');
      return;
    }
    const validTopics = createTopics.filter(t => t.trim());
    if (validTopics.length < 3) {
      setError('至少需要3个话题');
      return;
    }

    try {
      const res = await axios.post('/api/sessions', {
        title: createTitle,
        description: createDesc,
        topics: validTopics,
      });
      const data = res.data;
      setSession(data);
      setIsSpeaker(true);
      setRoomCode(data.room_code);
      setCurrentTopic(data.topics[0]);
      setTopics(data.topics);
      setView('session');

      const s = connectSocket();
      s.on('connect', () => {
        s.emit('speaker_join', {
          room_code: data.room_code,
          speaker_id: data.speaker_id,
        });
      });
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    }
  };

  const handleJoin = () => {
    setError('');
    const code = joinCode.trim();
    if (!code) {
      setError('请输入房间码');
      return;
    }

    const s = connectSocket();
    s.on('connect', () => {
      s.emit('join_session', { room_code: code });
    });

    s.on('session_joined', (data: SessionData) => {
      setSession(data);
      setIsSpeaker(false);
      setRoomCode(code);
      setCurrentTopic(data.current_topic);
      setTopics(data.topics);
      setAudienceCount(data.audience_count || 0);
      setView('session');
    });

    s.on('error', (err: { message: string }) => {
      setError(err.message);
      s.disconnect();
    });
  };

  const addTopicField = () => {
    setCreateTopics([...createTopics, '']);
  };

  const updateTopicField = (index: number, value: string) => {
    const updated = [...createTopics];
    updated[index] = value;
    setCreateTopics(updated);
  };

  if (view === 'create') {
    return (
      <div style={styles.createContainer}>
        <motion.div
          style={styles.createCard}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={styles.createTitle}>创建分享会</h1>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <label style={styles.label}>分享会标题</label>
          <input
            style={styles.input}
            value={createTitle}
            onChange={e => setCreateTitle(e.target.value)}
            maxLength={30}
            placeholder="输入标题（最多30字）"
          />

          <label style={styles.label}>描述</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: 'vertical' }}
            value={createDesc}
            onChange={e => setCreateDesc(e.target.value)}
            placeholder="输入分享会描述"
          />

          <label style={styles.label}>话题列表（至少3个）</label>
          {createTopics.map((t, i) => (
            <input
              key={i}
              style={styles.input}
              value={t}
              onChange={e => updateTopicField(i, e.target.value)}
              maxLength={50}
              placeholder={`话题 ${i + 1}`}
            />
          ))}
          <button style={styles.addBtn} onClick={addTopicField}>+ 添加话题</button>

          <div style={styles.btnRow}>
            <button style={styles.primaryBtn} onClick={handleCreate}>创建分享会</button>
            <button style={styles.secondaryBtn} onClick={() => { setView('join'); setError(''); }}>加入分享会</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div style={styles.createContainer}>
        <motion.div
          style={styles.createCard}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={styles.createTitle}>加入分享会</h1>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <label style={styles.label}>房间码</label>
          <input
            style={{ ...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            maxLength={6}
            placeholder="输入6位房间码"
          />

          <div style={styles.btnRow}>
            <button style={styles.primaryBtn} onClick={handleJoin}>加入</button>
            <button style={styles.secondaryBtn} onClick={() => { setView('create'); setError(''); }}>返回创建</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <SocketContext.Provider value={socket}>
      <SessionContext.Provider value={{
        session, isSpeaker, voterId, roomCode,
        currentTopic, history, paceBanner, audienceCount, topics,
        setCurrentTopic, setHistory,
      }}>
        <div style={styles.sessionLayout}>
          <AnimatePresence>
            {paceBanner && !isSpeaker && (
              <motion.div
                key="pace-banner"
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'fixed',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  background: '#000000b3',
                  color: '#fff',
                  padding: '12px 32px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {paceBanner.type === 'speed_up' ? '⚡' : '🐢'} {paceBanner.message}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.mainContent}>
            <div style={styles.sessionHeader}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{session?.title}</h2>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>
                  房间码: <strong style={{ color: '#e94560' }}>{roomCode}</strong>
                  {' · '}{audienceCount} 位观众
                </span>
              </div>
            </div>
            <VoteBoard />
            {isSpeaker && <SpeakerControls />}
          </div>
          <div style={styles.sidebar}>
            <VoteHistory />
          </div>
        </div>
      </SessionContext.Provider>
    </SocketContext.Provider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  createContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: 24,
    background: 'var(--bg-primary)',
  },
  createCard: {
    background: 'var(--bg-card)',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 480,
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
  },
  createTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
    color: 'var(--accent)',
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 8,
  },
  addBtn: {
    background: 'transparent',
    color: 'var(--accent)',
    fontSize: 13,
    padding: '6px 12px',
    border: '1px dashed var(--accent)',
    borderRadius: 12,
    marginBottom: 16,
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
  },
  primaryBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    border: '1px solid var(--border-color)',
  },
  errorBanner: {
    background: '#7f1d1d',
    color: '#fca5a5',
    padding: '8px 14px',
    borderRadius: 12,
    fontSize: 13,
    marginBottom: 12,
  },
  sessionLayout: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    background: 'var(--bg-primary)',
  },
  mainContent: {
    width: '70%',
    height: '100%',
    overflow: 'auto',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sidebar: {
    width: '30%',
    height: '100%',
    borderLeft: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    overflow: 'auto',
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'var(--bg-card)',
    borderRadius: 16,
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
  },
};
