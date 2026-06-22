import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import type { WhiteboardElement, DrawPath, StickyNote, User, Point, Tool, Snapshot } from './types';

const SERVER_URL = 'http://localhost:3001';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#ff4757');
  const [size, setSize] = useState(3);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [historyPanel, setHistoryPanel] = useState(true);

  const undoStack = useRef<WhiteboardElement[][]>([]);
  const redoStack = useRef<WhiteboardElement[][]>([]);
  const lastSnapshotTime = useRef<number>(Date.now());
  const localDrawingId = useRef<string | null>(null);

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);
      console.log('Connected to whiteboard server');
    });

    s.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from whiteboard server');
    });

    s.on('init', (data: { user: User; users: User[]; elements: WhiteboardElement[]; snapshots: Snapshot[] }) => {
      setCurrentUser(data.user);
      setUsers(data.users);
      setElements(data.elements);
      setSnapshots(data.snapshots);
      lastSnapshotTime.current = Date.now();
    });

    s.on('user:join', (user: User) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    });

    s.on('user:leave', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
    });

    s.on('cursor:update', (data: { userId: string; cursor: Point }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, cursor: data.cursor } : u))
      );
    });

    s.on('draw:start', (data: { element: WhiteboardElement }) => {
      if (data.element.userId === s.id) return;
      setElements((prev) => [...prev, data.element]);
    });

    s.on('draw:continue', (data: { id: string; point: Point }) => {
      if (data.id === localDrawingId.current) return;
      setElements((prev) =>
        prev.map((e) => {
          if (e.id === data.id && e.type === 'path') {
            return { ...e, points: [...(e as DrawPath).points, data.point] } as DrawPath;
          }
          return e;
        })
      );
    });

    s.on('draw:end', (_data: { id: string }) => {
    });

    s.on('element:add', (data: { element: WhiteboardElement }) => {
      setElements((prev) => [...prev, data.element]);
    });

    s.on('element:update', (data: { id: string; updates: Partial<WhiteboardElement> }) => {
      setElements((prev) =>
        prev.map((e) => (e.id === data.id ? ({ ...e, ...data.updates } as WhiteboardElement) : e))
      );
    });

    s.on('element:remove', (data: { id: string }) => {
      setElements((prev) => prev.filter((e) => e.id !== data.id));
    });

    s.on('snapshot:list', (list: Snapshot[]) => {
      setSnapshots(list);
    });

    s.on('snapshot:restored', (data: { elements: WhiteboardElement[] }) => {
      setRestoring(true);
      setElements(data.elements);
      undoStack.current = [];
      redoStack.current = [];
      setTimeout(() => setRestoring(false), 550);
    });

    s.on('elements:replace', (data: { elements: WhiteboardElement[] }) => {
      setElements(data.elements);
    });

    return () => {
      s.close();
    };
  }, []);

  const pushUndo = useCallback(() => {
    undoStack.current.push(JSON.parse(JSON.stringify(elements)));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [elements]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0 || !socket) return;
    redoStack.current.push(JSON.parse(JSON.stringify(elements)));
    const prev = undoStack.current.pop()!;
    setElements(prev);
    socket.emit('elements:replace', { elements: prev });
  }, [elements, socket]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0 || !socket) return;
    undoStack.current.push(JSON.parse(JSON.stringify(elements)));
    const next = redoStack.current.pop()!;
    setElements(next);
    socket.emit('elements:replace', { elements: next });
  }, [elements, socket]);

  const handleDrawStart = useCallback(
    (el: WhiteboardElement) => {
      pushUndo();
      localDrawingId.current = el.id;
      socket?.emit('draw:start', { element: el });
    },
    [socket, pushUndo]
  );

  const handleDrawContinue = useCallback(
    (id: string, point: Point) => {
      socket?.emit('draw:continue', { id, point });
    },
    [socket]
  );

  const handleDrawEnd = useCallback(
    (id: string) => {
      socket?.emit('draw:end', { id });
      localDrawingId.current = null;
    },
    [socket]
  );

  const handleElementAdd = useCallback(
    (el: WhiteboardElement) => {
      pushUndo();
      socket?.emit('element:add', { element: el });
    },
    [socket, pushUndo]
  );

  const handleElementUpdate = useCallback(
    (id: string, updates: Partial<WhiteboardElement>) => {
      socket?.emit('element:update', { id, updates });
    },
    [socket]
  );

  const handleElementRemove = useCallback(
    (id: string) => {
      pushUndo();
      socket?.emit('element:remove', { id });
    },
    [socket, pushUndo]
  );

  const handleCursorMove = useCallback(
    (point: Point) => {
      socket?.emit('cursor:move', point);
    },
    [socket]
  );

  const handleSaveSnapshot = useCallback(() => {
    if (!socket) return;
    const snap: Snapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      label: '手动保存',
      elements: JSON.parse(JSON.stringify(elements)),
    };
    socket.emit('snapshot:save', { snapshot: snap });
    lastSnapshotTime.current = Date.now();
  }, [socket, elements]);

  const handleRestoreSnapshot = useCallback(
    (snapId: string) => {
      if (!socket || restoring) return;
      socket.emit('snapshot:restore', { snapshotId: snapId });
    },
    [socket, restoring]
  );

  useEffect(() => {
    if (!socket || !connected) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastSnapshotTime.current >= 30000 && elements.length > 0) {
        lastSnapshotTime.current = now;
        const snap: Snapshot = {
          id: uuidv4(),
          timestamp: now,
          label: '自动保存',
          elements: JSON.parse(JSON.stringify(elements)),
        };
        socket.emit('snapshot:save', { snapshot: snap });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [socket, connected, elements]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#2c2c54' }}>
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSaveSnapshot={handleSaveSnapshot}
        canUndo={undoStack.current.length > 0}
        canRedo={redoStack.current.length > 0}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: historyPanel ? '80%' : '100%',
          height: '100%',
          position: 'relative',
          transition: 'width 0.3s ease',
          flexShrink: 0,
        }}>
          <Canvas
            elements={elements}
            setElements={setElements}
            users={users}
            currentUser={currentUser}
            tool={tool}
            color={color}
            size={size}
            onDrawStart={handleDrawStart}
            onDrawContinue={handleDrawContinue}
            onDrawEnd={handleDrawEnd}
            onElementAdd={handleElementAdd}
            onElementUpdate={handleElementUpdate}
            onElementRemove={handleElementRemove}
            onCursorMove={handleCursorMove}
            restoring={restoring}
          />

          {currentUser && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(44,44,84,0.92)', color: '#f7f1e3',
              padding: '6px 12px', borderRadius: 16, fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 8, zIndex: 100,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: currentUser.color, boxShadow: `0 0 6px ${currentUser.color}`,
              }} />
              <span style={{ fontWeight: 500 }}>{currentUser.name}</span>
              <span style={{ opacity: 0.5, fontSize: 11 }}>|</span>
              <span style={{ opacity: 0.7, fontSize: 11 }}>在线 {users.length} 人</span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#2ed573' : '#ff4757',
                marginLeft: 2,
              }} />
            </div>
          )}

          <button
            onClick={() => setHistoryPanel(!historyPanel)}
            className="history-toggle-btn"
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 100,
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(44,44,84,0.92)', color: '#f7f1e3',
              border: 'none', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'all 0.15s',
            }}
            title={historyPanel ? '隐藏历史面板' : '显示历史面板'}
          >
            {historyPanel ? '▶' : '◀'}
          </button>
        </div>

        {historyPanel && (
          <div style={{
            width: '20%',
            minWidth: 260,
            background: '#f7f1e3',
            borderLeft: '1px solid #d1ccc0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #d1ccc0',
              background: 'linear-gradient(135deg, #f7f1e3, #efe6d0)',
              borderRadius: '0 0 12px 12px',
            }}>
              <h3 style={{ color: '#2c2c54', fontSize: 15, marginBottom: 4, fontWeight: 600 }}>
                📋 版本历史
              </h3>
              <p style={{ color: '#706fd3', fontSize: 11, opacity: 0.85 }}>
                共 {snapshots.length} 个版本 · 每30秒自动保存
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {snapshots.length === 0 && (
                <div style={{
                  padding: 32, textAlign: 'center', color: '#999', fontSize: 13,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                  暂无历史版本
                  <br />
                  <span style={{ fontSize: 11, color: '#bbb' }}>
                    点击工具栏 💾 手动保存
                  </span>
                </div>
              )}

              {[...snapshots].reverse().map((snap, idx) => {
                const isAuto = snap.label === '自动保存';
                const prevSnap = snapshots[snapshots.length - idx - 2];
                const showDate = !prevSnap || formatDate(prevSnap.timestamp) !== formatDate(snap.timestamp);

                return (
                  <React.Fragment key={snap.id}>
                    {showDate && (
                      <div style={{
                        fontSize: 11, color: '#706fd3', fontWeight: 600,
                        padding: '8px 10px 4px', marginTop: idx === 0 ? 0 : 8,
                      }}>
                        {formatDate(snap.timestamp)}
                      </div>
                    )}
                    <div
                      className="snapshot-item"
                      onClick={() => handleRestoreSnapshot(snap.id)}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 4,
                        borderRadius: 12,
                        background: 'transparent',
                        cursor: 'pointer',
                        position: 'relative',
                        borderLeft: `3px solid ${isAuto ? '#ffa502' : '#706fd3'}`,
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 9, padding: '1px 7px', borderRadius: 8,
                          background: isAuto ? '#ffa502' : '#706fd3',
                          color: '#fff', fontWeight: 600, letterSpacing: 0.5,
                        }}>
                          {isAuto ? '自动' : '手动'}
                        </span>
                        <span style={{ color: '#2c2c54', fontSize: 12, fontWeight: 600 }}>
                          {formatTime(snap.timestamp)}
                        </span>
                      </div>
                      <div style={{ color: '#888', fontSize: 11, display: 'flex', gap: 10 }}>
                        <span>📝 {snap.elements.filter((e) => e.type === 'sticky').length}</span>
                        <span>✏️ {snap.elements.filter((e) => e.type === 'path').length}</span>
                        <span>🔗 {snap.elements.filter((e) => e.type === 'line').length}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #d1ccc0',
              background: '#efe6d0',
            }}>
              <div style={{ fontSize: 10, color: '#888', textAlign: 'center' }}>
                点击版本可恢复白板至该状态
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .history-toggle-btn:hover {
          background: rgba(64,64,122,0.95) !important;
          transform: scale(1.05);
        }
        .history-toggle-btn:active {
          transform: scale(0.95);
        }
        .snapshot-item:hover {
          background: #d1ccc0 !important;
        }
        .snapshot-item:active {
          opacity: 0.8;
        }
        @media (max-width: 768px) {
          .snapshot-item {
            padding: 8px 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
