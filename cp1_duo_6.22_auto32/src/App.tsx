import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import type { WhiteboardElement, User, Point, Tool, Snapshot } from './types';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
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
  const lastSnapshotTime = useRef<number>(0);

  useEffect(() => {
    const s = io('http://localhost:3001');
    (window as any).__socket = s;
    setSocket(s);

    s.on('init', (data: { user: User; users: User[]; elements: WhiteboardElement[]; snapshots: Snapshot[] }) => {
      setCurrentUser(data.user);
      setUsers(data.users);
      setElements(data.elements);
      setSnapshots(data.snapshots);
    });

    s.on('user:join', (user: User) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    });

    s.on('user:leave', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
    });

    s.on('cursor:update', (data: { userId: string; cursor: Point }) => {
      setUsers((prev) => prev.map((u) => (u.id === data.userId ? { ...u, cursor: data.cursor } : u)));
    });

    s.on('draw:start', (data: { element: WhiteboardElement }) => {
      setElements((prev) => [...prev, data.element]);
    });

    s.on('draw:continue', (data: { id: string; point: Point }) => {
      setElements((prev) =>
        prev.map((e) => {
          if (e.id === data.id && e.type === 'path') {
            return { ...e, points: [...(e as any).points, data.point] } as WhiteboardElement;
          }
          return e;
        })
      );
    });

    s.on('draw:end', () => {});

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
      setTimeout(() => setRestoring(false), 500);
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

  const handleDrawEnd = useCallback(() => {
    socket?.emit('draw:end', {});
  }, [socket]);

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
      label: '手动保存 - ' + new Date().toLocaleTimeString(),
      elements: JSON.parse(JSON.stringify(elements)),
    };
    socket.emit('snapshot:save', { snapshot: snap });
    setSnapshots((prev) => [...prev, snap]);
  }, [socket, elements]);

  const handleRestoreSnapshot = useCallback(
    (snapId: string) => {
      if (!socket) return;
      socket.emit('snapshot:restore', { snapshotId: snapId });
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      if (Date.now() - lastSnapshotTime.current >= 30000 && elements.length > 0) {
        lastSnapshotTime.current = Date.now();
        const snap: Snapshot = {
          id: uuidv4(),
          timestamp: Date.now(),
          label: '自动保存 - ' + new Date().toLocaleTimeString(),
          elements: JSON.parse(JSON.stringify(elements)),
        };
        socket.emit('snapshot:save', { snapshot: snap });
        setSnapshots((prev) => [...prev, snap]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [socket, elements]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
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
        <div style={{ width: historyPanel ? '80%' : '100%', height: '100%', position: 'relative', transition: 'width 0.3s' }}>
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
            onCursorMove={handleCursorMove}
            restoring={restoring}
          />

          {currentUser && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(44,44,84,0.9)', color: '#f7f1e3',
              padding: '8px 14px', borderRadius: 20, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8, zIndex: 100,
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: currentUser.color }} />
              <span>{currentUser.name}</span>
              <span style={{ opacity: 0.6, marginLeft: 8 }}>
                在线 {users.length} 人
              </span>
            </div>
          )}

          <button
            onClick={() => setHistoryPanel(!historyPanel)}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 100,
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(44,44,84,0.9)', color: '#f7f1e3',
              border: 'none', cursor: 'pointer', fontSize: 16,
            }}
            title={historyPanel ? '隐藏历史' : '显示历史'}
          >
            {historyPanel ? '▶' : '◀'}
          </button>
        </div>

        {historyPanel && (
          <div style={{
            width: '20%', minWidth: 260, background: '#f7f1e3',
            borderLeft: '1px solid #d1ccc0', display: 'flex',
            flexDirection: 'column', overflow: 'hidden',
            transition: 'width 0.3s',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #d1ccc0',
              background: '#f0e8d8',
            }}>
              <h3 style={{ color: '#2c2c54', fontSize: 16, marginBottom: 4 }}>版本历史</h3>
              <p style={{ color: '#706fd3', fontSize: 12, opacity: 0.8 }}>
                共 {snapshots.length} 个版本，每30秒自动保存
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {snapshots.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>
                  暂无历史版本<br />
                  <span style={{ fontSize: 11 }}>点击右上角 💾 手动保存</span>
                </div>
              )}
              {[...snapshots].reverse().map((snap, idx) => (
                <div
                  key={snap.id}
                  onClick={() => handleRestoreSnapshot(snap.id)}
                  style={{
                    padding: '12px 14px',
                    marginBottom: 6,
                    borderRadius: 12,
                    background: 'transparent',
                    cursor: 'pointer',
                    position: 'relative',
                    borderLeft: `3px solid ${snap.label.startsWith('自动') ? '#ffa502' : '#706fd3'}`,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#d1ccc0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 8,
                      background: snap.label.startsWith('自动') ? '#ffa502' : '#706fd3',
                      color: '#fff', fontWeight: 500,
                    }}>
                      {snap.label.startsWith('自动') ? '自动' : '手动'}
                    </span>
                    <span style={{ color: '#2c2c54', fontSize: 13, fontWeight: 500 }}>
                      {formatTime(snap.timestamp)}
                    </span>
                  </div>
                  <div style={{
                    color: '#666', fontSize: 12, marginLeft: 2,
                    display: 'flex', gap: 12,
                  }}>
                    <span>📝 {snap.elements.filter((e) => e.type === 'sticky').length} 便签</span>
                    <span>✏️ {snap.elements.filter((e) => e.type === 'path').length} 笔画</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
