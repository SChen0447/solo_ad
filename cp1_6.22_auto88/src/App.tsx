import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import CanvasBoard, { CanvasBoardHandle, User } from './CanvasBoard';
import Sidebar from './Sidebar';
import {
  CanvasState,
  NEON_PALETTE,
  createEmptyCanvas,
  AffectedCell,
  Operation
} from './pixelOperations';
import { HistoryManager } from './historyManager';

const STORAGE_KEY_USERS = 'pixel_board_users';
const STORAGE_KEY_CURRENT = 'pixel_board_current_user';

function generateUserName(usedNames: Set<string>): string {
  for (let i = 0; i < 26; i++) {
    const name = `User-${String.fromCharCode(65 + i)}`;
    if (!usedNames.has(name)) return name;
  }
  return `User-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const App: React.FC = () => {
  const historyManager = useMemo(() => new HistoryManager(), []);
  const canvasRef = useRef<CanvasBoardHandle>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>(() => createEmptyCanvas());
  const [currentColor, setCurrentColor] = useState<string>(NEON_PALETTE[0]);
  const [brushSize, setBrushSize] = useState<1 | 4>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [replayTotal, setReplayTotal] = useState(0);
  const replayStopRef = useRef(false);
  const [sidebarHeight, setSidebarHeight] = useState(260);
  const [isMobile, setIsMobile] = useState(false);
  const draggingSidebar = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(260);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    historyManager.subscribe(() => forceRerender(n => n + 1));
    historyManager.loadFromServer();
  }, [historyManager]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let storedUsers: User[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (raw) storedUsers = JSON.parse(raw);
    } catch {}

    let storedCurrent: User | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (raw) storedCurrent = JSON.parse(raw);
    } catch {}

    const now = Date.now();

    storedUsers = storedUsers.filter(u => {
      if (!u.id || !u.name || !u.color) return false;
      if (now - u.lastActive > 120000) return false;
      return true;
    });

    const currentValid = storedCurrent && storedUsers.find(u => storedCurrent && u.id === storedCurrent.id);
    if (!storedCurrent || !currentValid) {
      const usedColors = new Set(storedUsers.map(u => u.color));
      const usedNames = new Set(storedUsers.map(u => u.name));
      let color = NEON_PALETTE[Math.floor(Math.random() * 20)];
      let tries = 0;
      while (usedColors.has(color) && tries < 24) {
        color = NEON_PALETTE[Math.floor(Math.random() * 24)];
        tries++;
      }
      const name = generateUserName(usedNames);
      storedCurrent = {
        id: `u_${Math.random().toString(36).slice(2, 10)}`,
        name,
        color,
        cursorX: 0,
        cursorY: 0,
        isOnCanvas: false,
        lastActive: now
      };
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(storedCurrent));
    }

    storedCurrent.lastActive = now;
    const existingIdx = storedUsers.findIndex(u => u.id === storedCurrent!.id);
    if (existingIdx >= 0) storedUsers[existingIdx] = { ...storedUsers[existingIdx], ...storedCurrent };
    else storedUsers.push(storedCurrent);

    if (storedUsers.length < 3 && Math.random() > 0.3) {
      const simNames = new Set(storedUsers.map(u => u.name));
      const simColors = new Set(storedUsers.map(u => u.color));
      for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
        let c = NEON_PALETTE[Math.floor(Math.random() * 20)];
        let t = 0;
        while (simColors.has(c) && t < 24) {
          c = NEON_PALETTE[(Math.floor(Math.random() * 24) + i) % 24];
          t++;
        }
        const simUser: User = {
          id: `sim_${Math.random().toString(36).slice(2, 10)}`,
          name: generateUserName(simNames),
          color: c,
          cursorX: Math.random() * 400 + 100,
          cursorY: Math.random() * 300 + 80,
          isOnCanvas: Math.random() > 0.3,
          lastActive: now - Math.floor(Math.random() * 30000)
        };
        simNames.add(simUser.name);
        simColors.add(simUser.color);
        storedUsers.push(simUser);
      }
    }

    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(storedUsers));
    setUsers(storedUsers);
    setCurrentUser(storedCurrent);
    setCurrentColor(storedCurrent.color);

    const interval = setInterval(() => {
      setUsers(prev => {
        const next = prev.map(u => ({
          ...u,
          cursorX: u.id !== storedCurrent!.id && u.isOnCanvas
            ? Math.max(0, Math.min(639, u.cursorX + (Math.random() - 0.5) * 20))
            : u.cursorX,
          cursorY: u.id !== storedCurrent!.id && u.isOnCanvas
            ? Math.max(0, Math.min(479, u.cursorY + (Math.random() - 0.5) * 20))
            : u.cursorY,
          isOnCanvas: u.id !== storedCurrent!.id
            ? Math.random() > 0.05 ? u.isOnCanvas : !u.isOnCanvas
            : u.isOnCanvas
        }));
        try { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next)); } catch {}
        return next;
      });
    }, 600);

    const heartbeat = setInterval(() => {
      setCurrentUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, lastActive: Date.now() };
        try { localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updated)); } catch {}
        return updated;
      });
      setUsers(prev => {
        if (!storedCurrent) return prev;
        const next = prev.map(u => u.id === storedCurrent!.id ? { ...u, lastActive: Date.now() } : u);
        try { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next)); } catch {}
        return next;
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
    };
  }, []);

  const handleDraw = useCallback(async (
    gridX: number,
    gridY: number,
    color: string,
    bs: 1 | 4,
    affected: AffectedCell[]
  ) => {
    if (!currentUser) return;
    await historyManager.push({
      type: 'draw',
      color,
      gridX,
      gridY,
      brushSize: bs,
      userId: currentUser.id
    }, affected);
  }, [currentUser, historyManager]);

  const handleCursorMove = useCallback((x: number, y: number, onCanvas: boolean) => {
    if (!currentUser) return;
    setUsers(prev => {
      const next = prev.map(u => u.id === currentUser.id
        ? { ...u, cursorX: x, cursorY: y, isOnCanvas: onCanvas, lastActive: Date.now() }
        : u
      );
      try { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(next)); } catch {}
      return next;
    });
    setCurrentUser(prev => prev ? { ...prev, cursorX: x, cursorY: y, isOnCanvas: onCanvas, lastActive: Date.now() } : prev);
  }, [currentUser]);

  const handleUndo = useCallback(() => {
    if (isReplaying) return;
    const entry = historyManager.undo();
    if (entry) {
      canvasRef.current?.undoStep(entry.affected);
    }
  }, [isReplaying, historyManager]);

  const handleClearConfirm = useCallback(async () => {
    await historyManager.clear();
    canvasRef.current?.resetCanvas();
    setCanvasState(createEmptyCanvas());
    setShowClearModal(false);
  }, [historyManager]);

  const handleSave = useCallback(() => {
    canvasRef.current?.exportPNG(users.length);
  }, [users.length]);

  const handleSelectEntry = useCallback((opId: string) => {
    const entry = historyManager.getEntryById(opId);
    if (entry) {
      canvasRef.current?.highlightCells(entry.affected);
    }
  }, [historyManager]);

  const runReplay = useCallback(async () => {
    if (isReplaying) return;
    const sequence = historyManager.getReplaySequence();
    if (sequence.length === 0) return;

    setIsReplaying(true);
    setReplayTotal(sequence.length);
    setReplayProgress(0);
    replayStopRef.current = false;
    canvasRef.current?.resetCanvas();
    setCanvasState(createEmptyCanvas());

    let baseTime = performance.now();
    for (let i = 0; i < sequence.length; i++) {
      if (replayStopRef.current) break;
      const op = sequence[i];
      canvasRef.current?.replayStep(op);
      setCanvasState(prev => {
        const result = canvasRef.current?.getCanvasState();
        return result ?? prev;
      });
      setReplayProgress(i + 1);

      baseTime += 300;
      const delay = Math.max(0, baseTime - performance.now());
      if (delay > 0) {
        await new Promise<void>(resolve => {
          const timer = setTimeout(() => resolve(), delay);
          const check = setInterval(() => {
            if (replayStopRef.current) {
              clearTimeout(timer);
              clearInterval(check);
              resolve();
            }
          }, 30);
          setTimeout(() => clearInterval(check), 500);
        });
      }
    }

    setIsReplaying(false);
  }, [isReplaying, historyManager]);

  const handleStopReplay = useCallback(() => {
    replayStopRef.current = true;
    setIsReplaying(false);
  }, []);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMobile) return;
    draggingSidebar.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = sidebarHeight;
    e.preventDefault();
  }, [isMobile, sidebarHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingSidebar.current) return;
      const delta = dragStartY.current - e.clientY;
      const newH = Math.max(120, Math.min(window.innerHeight * 0.6, dragStartH.current + delta));
      setSidebarHeight(newH);
    };
    const onUp = () => { draggingSidebar.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!currentUser) {
    return <div style={styles.loading}>正在初始化协作环境...</div>;
  }

  const layoutStyle: React.CSSProperties = isMobile
    ? { flexDirection: 'column' as const }
    : { flexDirection: 'row' as const };

  const canvasAreaStyle: React.CSSProperties = isMobile
    ? { width: '100%', height: `calc(100vh - ${sidebarHeight}px - 52px)` }
    : { width: '70%', height: '100%' };

  const sidebarStyle: React.CSSProperties = isMobile
    ? { width: '100%', height: `${sidebarHeight}px`, borderTop: '1px solid #00ff88', borderRight: 'none' }
    : { width: '30%', height: '100%', borderLeft: '1px solid #00ff88' };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandLogo}>◆</span>
          <span style={styles.brandName}>LiveCode</span>
          <span style={styles.brandSub}>像素协作白板</span>
        </div>
        <div style={styles.headerInfo}>
          <span style={{ ...styles.onlineDot, backgroundColor: '#00ff88' }} />
          <span style={styles.onlineText}>{users.length} 人在线</span>
        </div>
      </div>

      <div style={{ ...styles.main, ...layoutStyle }}>
        <div style={{ ...canvasAreaStyle, ...styles.canvasArea }}>
          <div style={styles.canvasWrapper}>
            <div style={styles.canvasInner}>
              <CanvasBoard
                ref={canvasRef}
                canvasState={canvasState}
                setCanvasState={setCanvasState}
                currentColor={currentColor}
                brushSize={brushSize}
                currentUser={currentUser}
                users={users}
                onDraw={handleDraw}
                onCursorMove={handleCursorMove}
              />
            </div>
          </div>

          <div style={styles.toolbarBottom}>
            <div style={styles.brushGroup}>
              <button
                onClick={() => setBrushSize(1)}
                style={{
                  ...styles.brushBtn,
                  ...(brushSize === 1 ? styles.brushBtnActive : {}),
                  boxShadow: brushSize === 1 ? `0 0 12px ${currentColor}` : 'none'
                }}
                title="细笔刷 (1格)"
              >
                <span style={{ width: '4px', height: '4px', borderRadius: '2px', backgroundColor: 'currentColor', display: 'inline-block' }} />
              </button>
              <button
                onClick={() => setBrushSize(4)}
                style={{
                  ...styles.brushBtn,
                  ...(brushSize === 4 ? styles.brushBtnActive : {}),
                  boxShadow: brushSize === 4 ? `0 0 12px ${currentColor}` : 'none'
                }}
                title="粗笔刷 (4格)"
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'currentColor', display: 'inline-block' }} />
              </button>
            </div>

            <div style={styles.palette}>
              {NEON_PALETTE.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentColor(color)}
                  style={{
                    ...styles.paletteColor,
                    backgroundColor: color,
                    outline: currentColor === color ? '2px solid #ffffff' : '1px solid #ffffff20',
                    outlineOffset: currentColor === color ? '2px' : '0',
                    boxShadow: currentColor === color ? `0 0 14px ${color}, 0 0 28px ${color}60` : 'none',
                    transform: currentColor === color ? 'scale(1.18)' : 'scale(1)'
                  }}
                  title={color}
                />
              ))}
            </div>

            <div style={styles.actionGroup}>
              <button
                onClick={() => !isReplaying && setShowClearModal(true)}
                disabled={isReplaying}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#2d3748',
                  color: '#ff6b6b',
                  borderColor: '#ff6b6b40',
                  cursor: isReplaying ? 'not-allowed' : 'pointer',
                  opacity: isReplaying ? 0.5 : 1
                }}
              >
                🗑 清空
              </button>
              <button
                onClick={handleUndo}
                disabled={isReplaying || historyManager.length === 0}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#2d3748',
                  color: '#ffcc00',
                  borderColor: '#ffcc0040',
                  cursor: (isReplaying || historyManager.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (isReplaying || historyManager.length === 0) ? 0.5 : 1
                }}
              >
                ↶ 撤销
              </button>
              <button
                onClick={handleSave}
                disabled={isReplaying}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#00ff8815',
                  color: '#00ff88',
                  borderColor: '#00ff8850',
                  cursor: isReplaying ? 'not-allowed' : 'pointer',
                  opacity: isReplaying ? 0.5 : 1
                }}
              >
                💾 保存
              </button>
            </div>
          </div>
        </div>

        {isMobile && (
          <div
            onMouseDown={handleSidebarMouseDown}
            style={styles.sidebarHandle}
            title="拖拽调整高度"
          >
            <div style={styles.handleBar} />
          </div>
        )}

        <div style={{ ...sidebarStyle, ...styles.sidebarArea }}>
          <Sidebar
            historyManager={historyManager}
            users={users}
            currentUserId={currentUser.id}
            isReplaying={isReplaying}
            replayProgress={replayProgress}
            replayTotal={replayTotal}
            onSelectEntry={handleSelectEntry}
            onStartReplay={runReplay}
            onStopReplay={handleStopReplay}
          />
        </div>
      </div>

      {showClearModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>确认清空画布？</div>
            <div style={styles.modalDesc}>此操作将移除所有绘制内容和操作历史，且无法撤销。</div>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowClearModal(false)}
                style={{ ...styles.modalBtn, backgroundColor: '#ffffff', color: '#2d3748' }}
              >
                取消
              </button>
              <button
                onClick={handleClearConfirm}
                style={{ ...styles.modalBtn, backgroundColor: '#e53e3e', color: '#ffffff', boxShadow: '0 0 16px #e53e3e80' }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f1320',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden'
  },
  loading: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1320',
    color: '#00ff88',
    fontSize: '16px',
    letterSpacing: '0.1em'
  },
  header: {
    height: '52px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    backgroundColor: '#151a26',
    borderBottom: '1px solid #2d3748'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandLogo: {
    color: '#00ff88',
    fontSize: '18px',
    textShadow: '0 0 10px #00ff88'
  },
  brandName: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.04em'
  },
  brandSub: {
    fontSize: '12px',
    color: '#718096',
    paddingLeft: '8px',
    borderLeft: '1px solid #2d3748',
    marginLeft: '2px'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor'
  },
  onlineText: {
    fontSize: '12px',
    color: '#a0aec0',
    fontWeight: 500
  },
  main: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    position: 'relative'
  },
  canvasArea: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    position: 'relative'
  },
  canvasWrapper: {
    flex: 1,
    overflow: 'auto',
    padding: '18px',
    boxSizing: 'border-box',
    minHeight: 0,
    scrollbarWidth: 'thin',
    scrollbarColor: '#4a5568 #151a26'
  },
  canvasInner: {
    minWidth: '100%',
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  toolbarBottom: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 16px',
    backgroundColor: '#151a26',
    borderTop: '1px solid #2d3748',
    flexWrap: 'wrap'
  },
  brushGroup: {
    display: 'flex',
    gap: '6px'
  },
  brushBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    border: '1px solid #2d3748',
    backgroundColor: '#1e2533',
    color: '#a0aec0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: 0
  },
  brushBtnActive: {
    borderColor: '#00ff8860',
    backgroundColor: '#00ff8815',
    color: '#00ff88'
  },
  palette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '5px',
    flex: 1,
    minWidth: '280px',
    justifyContent: 'center'
  },
  paletteColor: {
    width: '22px',
    height: '22px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.18s ease'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
  },
  sidebarArea: {
    flexShrink: 0,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden'
  },
  sidebarHandle: {
    height: '10px',
    cursor: 'row-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151a26',
    borderTop: '1px solid #2d3748',
    borderBottom: '1px solid #2d3748',
    flexShrink: 0
  },
  handleBar: {
    width: '44px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: '#4a5568'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalCard: {
    backgroundColor: '#1a1f2e',
    borderRadius: '14px',
    padding: '28px',
    maxWidth: '360px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid #2d3748',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
  },
  modalIcon: {
    fontSize: '40px',
    marginBottom: '14px'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '8px'
  },
  modalDesc: {
    fontSize: '13px',
    color: '#a0aec0',
    lineHeight: 1.6,
    marginBottom: '22px'
  },
  modalButtons: {
    display: 'flex',
    gap: '10px'
  },
  modalBtn: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  }
};

export default App;
