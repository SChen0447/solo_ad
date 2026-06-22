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
          <div className="history-panel" style={{
            width: '20%',
            minWidth: 280,
            background: '#f7f1e3',
            borderLeft: '1px solid #d1ccc0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            borderRadius: '0 0 0 0',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #d1ccc0',
              background: 'linear-gradient(135deg, #f7f1e3 0%, #efe6d0 100%)',
              position: 'relative',
            }}>
              <h3 style={{ color: '#2c2c54', fontSize: 16, marginBottom: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                📋 版本历史
              </h3>
              <p style={{ color: '#706fd3', fontSize: 12, opacity: 0.85, fontWeight: 500 }}>
                共 <strong>{snapshots.length}</strong> 个版本 · 每30秒自动保存
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px 12px 16px' }}>
              {snapshots.length === 0 && (
                <div style={{
                  padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: 13,
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>暂无历史版本</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>
                    点击工具栏 💾 手动保存版本
                  </div>
                </div>
              )}

              <div style={{ position: 'relative' }}>
                {snapshots.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 9,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: 'linear-gradient(to bottom, #d1ccc0 0%, #e0d8c8 100%)',
                    borderRadius: 2,
                  }} />
                )}

                {[...snapshots].reverse().map((snap, idx) => {
                  const isAuto = snap.label === '自动保存';
                  const prevSnap = snapshots[snapshots.length - idx - 2];
                  const showDate = !prevSnap || formatDate(prevSnap.timestamp) !== formatDate(snap.timestamp);
                  const dotColor = isAuto ? '#ffa502' : '#706fd3';

                  return (
                    <React.Fragment key={snap.id}>
                      {showDate && (
                        <div style={{
                          fontSize: 11, color: '#706fd3', fontWeight: 700,
                          padding: '12px 4px 6px 26px',
                          position: 'relative',
                        }}>
                          {formatDate(snap.timestamp)}
                        </div>
                      )}
                      <div
                        className="snapshot-item"
                        onClick={() => handleRestoreSnapshot(snap.id)}
                        style={{
                          padding: '10px 12px 10px 28px',
                          marginBottom: 6,
                          borderRadius: 12,
                          background: 'transparent',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          borderLeft: '3px solid transparent',
                          marginLeft: 2,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#d1ccc0';
                          e.currentTarget.style.borderLeftColor = dotColor;
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderLeftColor = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: -17,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: dotColor,
                            border: '2px solid #f7f1e3',
                            boxShadow: `0 0 0 1px ${dotColor}44, 0 1px 3px rgba(0,0,0,0.15)`,
                            zIndex: 1,
                            transition: 'all 0.2s ease',
                          }}
                          className="snapshot-dot"
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 10,
                            background: isAuto ? 'linear-gradient(135deg, #ffa502, #ff8c00)' : 'linear-gradient(135deg, #706fd3, #5f5fcd)',
                            color: '#fff', fontWeight: 700, letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            boxShadow: isAuto ? '0 2px 4px rgba(255,165,2,0.3)' : '0 2px 4px rgba(112,111,211,0.3)',
                          }}>
                            {isAuto ? 'AUTO' : 'MANUAL'}
                          </span>
                          <span style={{ color: '#2c2c54', fontSize: 14, fontWeight: 700 }}>
                            {formatTime(snap.timestamp)}
                          </span>
                        </div>
                        <div style={{ color: '#777', fontSize: 11, display: 'flex', gap: 12, fontWeight: 500 }}>
                          <span>📝 {snap.elements.filter((e) => e.type === 'sticky').length} 便签</span>
                          <span>✏️ {snap.elements.filter((e) => e.type === 'path').length} 笔画</span>
                          <span>🔗 {snap.elements.filter((e) => e.type === 'line').length} 连线</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #d1ccc0',
              background: 'linear-gradient(135deg, #efe6d0, #e8dfc8)',
            }}>
              <div style={{
                fontSize: 10, color: '#888', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 14 }}>💡</span>
                <span>点击版本即可恢复白板至该状态</span>
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
