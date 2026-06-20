import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import ScoreEditor from './modules/sheet/ScoreEditor';
import AnnotationLayer from './modules/sheet/AnnotationLayer';
import SessionManager from './modules/session/SessionManager';
import PlaybackEngine from './modules/playback/PlaybackEngine';
import DiffAnalyzer from './modules/analysis/DiffAnalyzer';
import type {
  User, Score, Note, Annotation, ToolMode, ScoreVersion,
  ConflictInfo, NotificationData, DiffReport
} from './types';

const PLAYBACK = new PlaybackEngine();

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(true);
  const [playbackStart, setPlaybackStart] = useState<number>(0);
  const [playbackEnd, setPlaybackEnd] = useState<number>(3);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
  const [highlightedDiffItem, setHighlightedDiffItem] = useState<{ x: number; y: number } | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [accidentalMode, setAccidentalMode] = useState<Note['accidental']>(null);
  const lastNoteUpdateRef = useRef<Record<string, string>>({});
  const lastAnnotationUpdateRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const s = io({ transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_joined', (data: { user: User; users: User[]; score: Score; roomId: string }) => {
      setCurrentUser(data.user);
      setUsers(data.users);
      setScore(data.score);
      setRoomId(data.roomId);
      setShowJoinModal(false);
      addNotification(`已加入房间 ${data.roomId}`, 'success');
    });

    socket.on('user_joined', (data: { user: User; userCount: number }) => {
      setUsers(prev => [...prev, data.user]);
      addNotification(`${data.user.name} 加入了房间`, 'info');
    });

    socket.on('user_left', (data: { user: User; userCount: number }) => {
      setUsers(prev => prev.filter(u => u.id !== data.user.id));
      addNotification(`${data.user.name} 离开了房间`, 'warning');
    });

    socket.on('note_updated', (data: { note: Note; action: string; userId: string; timestamp: string }) => {
      const noteId = data.note.id;
      const lastUpdate = lastNoteUpdateRef.current[noteId];
      if (lastUpdate && lastUpdate > data.timestamp) {
        setConflicts(prev => [...prev, {
          id: `conflict-${Date.now()}-${noteId}`,
          type: 'note',
          x: data.note.x,
          y: data.note.y,
          timestamp: Date.now(),
        }]);
        setTimeout(() => {
          setConflicts(prev => prev.filter(c => c.id !== noteId));
        }, 500);
        return;
      }
      lastNoteUpdateRef.current[noteId] = data.timestamp;

      setScore(prev => {
        if (!prev) return prev;
        let newNotes = [...prev.notes];
        if (data.action === 'add') {
          newNotes.push(data.note);
        } else if (data.action === 'remove') {
          newNotes = newNotes.filter(n => n.id !== noteId);
        } else if (data.action === 'update') {
          newNotes = newNotes.map(n => n.id === noteId ? data.note : n);
        }
        return { ...prev, notes: newNotes, updatedAt: new Date().toISOString() };
      });
    });

    socket.on('annotation_updated', (data: { annotation: Annotation; action: string; userId: string; timestamp: string }) => {
      const annId = data.annotation.id;
      const lastUpdate = lastAnnotationUpdateRef.current[annId];
      if (lastUpdate && lastUpdate > data.timestamp) {
        setConflicts(prev => [...prev, {
          id: `conflict-${Date.now()}-${annId}`,
          type: 'annotation',
          x: data.annotation.x,
          y: data.annotation.y,
          timestamp: Date.now(),
        }]);
        setTimeout(() => {
          setConflicts(prev => prev.filter(c => c.id !== annId));
        }, 500);
        return;
      }
      lastAnnotationUpdateRef.current[annId] = data.timestamp;

      setScore(prev => {
        if (!prev) return prev;
        let newAnnotations = [...prev.annotations];
        if (data.action === 'add') {
          newAnnotations.push(data.annotation);
        } else if (data.action === 'remove') {
          newAnnotations = newAnnotations.filter(a => a.id !== annId);
        } else if (data.action === 'update') {
          newAnnotations = newAnnotations.map(a => a.id === annId ? data.annotation : a);
        }
        return { ...prev, annotations: newAnnotations, updatedAt: new Date().toISOString() };
      });
    });

    socket.on('error', (data: { message: string }) => {
      addNotification(data.message, 'error');
    });
  }, [socket]);

  useEffect(() => {
    PLAYBACK.setProgressCallback((progress, currentMeasure) => {
      setPlaybackProgress(progress);
    });
  }, []);

  const addNotification = useCallback((message: string, type: NotificationData['type']) => {
    const id = `notif-${Date.now()}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const handleJoinRoom = useCallback(() => {
    if (!socket || !userName.trim() || !roomId.trim()) {
      addNotification('请填写房间号和昵称', 'warning');
      return;
    }
    socket.emit('join_room', { roomId, roomName: roomName || roomId, userName });
  }, [socket, userName, roomId, roomName, addNotification]);

  const handleNoteAdd = useCallback((note: Note) => {
    if (!socket || !currentUser || !score) return;
    const timestamp = new Date().toISOString();
    const noteWithMeta = { ...note, updatedAt: timestamp, updatedBy: currentUser.id };
    lastNoteUpdateRef.current[note.id] = timestamp;
    setScore(prev => prev ? { ...prev, notes: [...prev.notes, noteWithMeta], updatedAt: timestamp } : prev);
    socket.emit('update_note', { roomId, note: noteWithMeta, action: 'add', userId: currentUser.id, timestamp });
  }, [socket, currentUser, score, roomId]);

  const handleNoteRemove = useCallback((noteId: string) => {
    if (!socket || !currentUser || !score) return;
    const timestamp = new Date().toISOString();
    lastNoteUpdateRef.current[noteId] = timestamp;
    setScore(prev => prev ? { ...prev, notes: prev.notes.filter(n => n.id !== noteId), updatedAt: timestamp } : prev);
    socket.emit('update_note', { roomId, note: { id: noteId }, action: 'remove', userId: currentUser.id, timestamp });
  }, [socket, currentUser, score, roomId]);

  const handleAnnotationAdd = useCallback((annotation: Annotation) => {
    if (!socket || !currentUser || !score) return;
    const timestamp = new Date().toISOString();
    const annWithMeta = { ...annotation, updatedAt: timestamp, updatedBy: currentUser.id };
    lastAnnotationUpdateRef.current[annotation.id] = timestamp;
    setScore(prev => prev ? { ...prev, annotations: [...prev.annotations, annWithMeta], updatedAt: timestamp } : prev);
    socket.emit('update_annotation', { roomId, annotation: annWithMeta, action: 'add', userId: currentUser.id, timestamp });
  }, [socket, currentUser, score, roomId]);

  const handleAnnotationUpdate = useCallback((annotation: Annotation) => {
    if (!socket || !currentUser || !score) return;
    const timestamp = new Date().toISOString();
    lastAnnotationUpdateRef.current[annotation.id] = timestamp;
    setScore(prev => prev ? {
      ...prev,
      annotations: prev.annotations.map(a => a.id === annotation.id ? { ...annotation, updatedAt: timestamp, updatedBy: currentUser.id } : a),
      updatedAt: timestamp,
    } : prev);
    socket.emit('update_annotation', { roomId, annotation: { ...annotation, updatedAt: timestamp, updatedBy: currentUser.id }, action: 'update', userId: currentUser.id, timestamp });
  }, [socket, currentUser, score, roomId]);

  const handleAnnotationRemove = useCallback((annotationId: string) => {
    if (!socket || !currentUser || !score) return;
    const timestamp = new Date().toISOString();
    lastAnnotationUpdateRef.current[annotationId] = timestamp;
    setScore(prev => prev ? { ...prev, annotations: prev.annotations.filter(a => a.id !== annotationId), updatedAt: timestamp } : prev);
    socket.emit('update_annotation', { roomId, annotation: { id: annotationId }, action: 'remove', userId: currentUser.id, timestamp });
  }, [socket, currentUser, score, roomId]);

  const handleStartPlayback = useCallback(() => {
    if (!score) return;
    PLAYBACK.loadScore(score.notes, playbackStart, playbackEnd, playbackSpeed);
    PLAYBACK.start();
    setIsPlaying(true);
  }, [score, playbackStart, playbackEnd, playbackSpeed]);

  const handlePausePlayback = useCallback(() => {
    PLAYBACK.pause();
    setIsPlaying(false);
  }, []);

  const handleStopPlayback = useCallback(() => {
    PLAYBACK.stop();
    setIsPlaying(false);
    setPlaybackProgress(0);
  }, []);

  const handleCreateSnapshot = useCallback(async () => {
    if (!roomId || !currentUser) return;
    try {
      const res = await axios.post(`/api/rooms/${roomId}/snapshot`, { userName: currentUser.name });
      addNotification(`快照 "${res.data.name}" 创建成功`, 'success');
      setScore(prev => prev ? { ...prev, versions: [...prev.versions, res.data] } : prev);
    } catch {
      addNotification('创建快照失败', 'error');
    }
  }, [roomId, currentUser, addNotification]);

  const handleCompareVersion = useCallback(async (versionId: string) => {
    if (!roomId || !score) return;
    try {
      const res = await axios.get(`/api/rooms/${roomId}/versions/${versionId}`);
      const analyzer = new DiffAnalyzer();
      const report = analyzer.compare(res.data, {
        notes: score.notes,
        annotations: score.annotations,
        measures: score.measures,
      });
      setCompareVersionId(versionId);
      setDiffReport(report);
    } catch {
      addNotification('加载版本失败', 'error');
    }
  }, [roomId, score, addNotification]);

  const handleDiffItemClick = useCallback((x: number, y: number) => {
    setHighlightedDiffItem({ x, y });
    setTimeout(() => setHighlightedDiffItem(null), 30000);
  }, []);

  if (showJoinModal) {
    return (
      <div className="join-modal-overlay">
        <motion.div
          className="join-modal"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <h2>🎵 虚拟音乐教室</h2>
          <p className="join-subtitle">加入协作房间，开始实时乐谱编辑</p>
          <div className="join-form">
            <div className="form-group">
              <label>房间号</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入或创建房间号"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>房间名（可选）</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="房间名称"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="你的昵称"
                className="form-input"
              />
            </div>
            <button className="btn-primary" onClick={handleJoinRoom}>
              🚀 加入房间
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">🎵</span>
          <span className="app-title">虚拟音乐教室</span>
          <span className="room-info">房间: {roomId} ({users.length}/4)</span>
        </div>
        <div className="header-right">
          {isMobile && (
            <button className="icon-btn" onClick={() => setShowMobilePanel(!showMobilePanel)}>
              {showMobilePanel ? '📝' : '☰'}
            </button>
          )}
        </div>
      </header>

      <div className="main-layout">
        <div className="score-area">
          <SessionManager
            users={users}
            currentUser={currentUser}
            roomId={roomId}
            socket={socket}
          />

          <div className="toolbar">
            <div className="tool-group">
              <button
                className={`tool-btn ${toolMode === 'select' ? 'active' : ''}`}
                onClick={() => setToolMode('select')}
                title="选择"
              >
                👆 选择
              </button>
              <button
                className={`tool-btn ${toolMode === 'add_quarter' ? 'active' : ''}`}
                onClick={() => setToolMode('add_quarter')}
                title="添加四分音符"
              >
                ♩ 四分
              </button>
              <button
                className={`tool-btn ${toolMode === 'add_eighth' ? 'active' : ''}`}
                onClick={() => setToolMode('add_eighth')}
                title="添加八分音符"
              >
                ♪ 八分
              </button>
              <button
                className={`tool-btn ${toolMode === 'delete' ? 'active' : ''}`}
                onClick={() => setToolMode('delete')}
                title="删除模式"
              >
                🗑️ 删除
              </button>
            </div>
            <div className="tool-group">
              <span className="tool-label">临时记号:</span>
              <button
                className={`tool-btn small ${accidentalMode === null ? 'active' : ''}`}
                onClick={() => setAccidentalMode(null)}
              >
                还原
              </button>
              <button
                className={`tool-btn small ${accidentalMode === 'sharp' ? 'active' : ''}`}
                onClick={() => setAccidentalMode('sharp')}
              >
                ♯ 升
              </button>
              <button
                className={`tool-btn small ${accidentalMode === 'flat' ? 'active' : ''}`}
                onClick={() => setAccidentalMode('flat')}
              >
                ♭ 降
              </button>
            </div>
            <div className="tool-group">
              <span className="tool-label">批注:</span>
              <button
                className={`tool-btn small ${toolMode === 'annotate_rect' ? 'active' : ''}`}
                onClick={() => setToolMode('annotate_rect')}
                title="矩形批注"
              >
                ▭ 矩形
              </button>
              <button
                className={`tool-btn small ${toolMode === 'annotate_circle' ? 'active' : ''}`}
                onClick={() => setToolMode('annotate_circle')}
                title="圆形批注"
              >
                ○ 圆形
              </button>
              <button
                className={`tool-btn small ${toolMode === 'annotate_highlight' ? 'active' : ''}`}
                onClick={() => setToolMode('annotate_highlight')}
                title="高亮批注"
              >
                🖍️ 高亮
              </button>
            </div>
          </div>

          <div className="playback-controls">
            <div className="playback-range">
              <label>起始小节:</label>
              <input
                type="number"
                min={0}
                max={score?.measures ?? 4}
                value={playbackStart}
                onChange={(e) => setPlaybackStart(Math.max(0, Math.min(playbackEnd - 1, parseInt(e.target.value) || 0)))}
                className="number-input"
              />
              <label>结束小节:</label>
              <input
                type="number"
                min={1}
                max={score?.measures ?? 4}
                value={playbackEnd}
                onChange={(e) => setPlaybackEnd(Math.max(playbackStart + 1, Math.min(score?.measures ?? 4, parseInt(e.target.value) || 1)))}
                className="number-input"
              />
            </div>
            <div className="playback-speed">
              <label>速度:</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              />
              <span>{playbackSpeed.toFixed(1)}x</span>
            </div>
            <div className="playback-buttons">
              {!isPlaying ? (
                <button className="play-btn" onClick={handleStartPlayback}>
                  ▶️ 播放
                </button>
              ) : (
                <button className="play-btn" onClick={handlePausePlayback}>
                  ⏸️ 暂停
                </button>
              )}
              <button className="play-btn secondary" onClick={handleStopPlayback}>
                ⏹️ 停止
              </button>
            </div>
          </div>

          <div className="score-wrapper">
            {score && (
              <>
                <ScoreEditor
                  score={score}
                  toolMode={toolMode}
                  accidentalMode={accidentalMode}
                  currentUser={currentUser}
                  onNoteAdd={handleNoteAdd}
                  onNoteRemove={handleNoteRemove}
                  playbackProgress={playbackProgress}
                  conflicts={conflicts}
                  highlightedDiff={highlightedDiffItem}
                />
                <AnnotationLayer
                  annotations={score.annotations}
                  toolMode={toolMode}
                  currentUser={currentUser}
                  onAnnotationAdd={handleAnnotationAdd}
                  onAnnotationUpdate={handleAnnotationUpdate}
                  onAnnotationRemove={handleAnnotationRemove}
                />
              </>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {(!isMobile || showMobilePanel) && (
            <motion.aside
              className={`side-panel ${isMobile ? 'mobile-drawer' : ''}`}
              initial={isMobile ? { y: '100%' } : { opacity: 0, x: 20 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, x: 0 }}
              exit={isMobile ? { y: '100%' } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {isMobile && (
                <button
                  className="close-drawer"
                  onClick={() => setShowMobilePanel(false)}
                >
                  ✕
                </button>
              )}

              <div className="panel-section">
                <h3 className="panel-title">👥 在线用户</h3>
                <div className="user-list">
                  {users.map(u => (
                    <div key={u.id} className="user-item">
                      <span className="user-color" style={{ backgroundColor: u.color }}></span>
                      <span className="user-name">{u.name}</span>
                      {u.id === currentUser?.id && <span className="user-self">(我)</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-section">
                <h3 className="panel-title">📝 批注列表</h3>
                <div className="annotation-list">
                  {score?.annotations.length === 0 && (
                    <p className="empty-hint">暂无批注</p>
                  )}
                  {score?.annotations.map(a => (
                    <motion.div
                      key={a.id}
                      className="annotation-card"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="annotation-header">
                        <span className="annotation-shape">
                          {a.shape === 'rectangle' ? '▭' : a.shape === 'circle' ? '○' : '🖍️'}
                        </span>
                        <span className="annotation-author" style={{ color: a.color }}>
                          {a.userName}
                        </span>
                      </div>
                      {a.text && <p className="annotation-text">{a.text}</p>}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="panel-section">
                <h3 className="panel-title">📚 版本快照</h3>
                <button className="btn-secondary full-width" onClick={handleCreateSnapshot}>
                  📸 创建快照
                </button>
                <div className="version-list">
                  {score?.versions.length === 0 && (
                    <p className="empty-hint">暂无快照</p>
                  )}
                  {score?.versions.map((v) => (
                    <div
                      key={v.id}
                      className={`version-item ${compareVersionId === v.id ? 'active' : ''}`}
                      onClick={() => handleCompareVersion(v.id)}
                    >
                      <div className="version-name">{v.name}</div>
                      <div className="version-meta">
                        {v.createdBy} · {new Date(v.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {diffReport && (
                <div className="panel-section">
                  <h3 className="panel-title">🔍 差异分析</h3>
                  <p className="diff-summary">共 {diffReport.totalChanges} 处变更</p>
                  <DiffTree report={diffReport} onItemClick={handleDiffItemClick} />
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {notifications.map((n, i) => (
          <motion.div
            key={n.id}
            className={`notification notification-${n.type}`}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 10 + i * 60, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {n.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DiffTree({ report, onItemClick }: { report: DiffReport; onItemClick: (x: number, y: number) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: any, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expanded.has(item.id);

    return (
      <div key={item.id}>
        <motion.div
          className={`diff-item ${isExpanded ? 'expanded' : ''}`}
          onClick={() => {
            if (hasChildren) toggle(item.id);
            if (item.oldValue?.x !== undefined && item.oldValue?.y !== undefined) {
              onItemClick(item.oldValue.x, item.oldValue.y);
            } else if (item.newValue?.x !== undefined && item.newValue?.y !== undefined) {
              onItemClick(item.newValue.x, item.newValue.y);
            }
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ paddingLeft: depth * 16 }}
        >
          <span className="diff-toggle">
            {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className={`diff-type diff-${item.type}`}>
            {item.type.includes('added') ? '+' : item.type.includes('removed') ? '-' : '~'}
          </span>
          <span className="diff-label">{item.label}</span>
        </motion.div>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {item.children!.map((child: any) => renderItem(child, depth + 1))}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="diff-tree">
      {report.items.map(item => renderItem(item))}
    </div>
  );
}
