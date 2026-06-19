import { useState, useEffect, useRef, useCallback } from 'react';
import type { NoteCard, Connection, AppState } from './types';
import { GraphEngine } from './GraphEngine';
import ConnectionCanvas from './ConnectionCanvas';

interface CreateModalState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  content: string;
}

const App = () => {
  const engineRef = useRef<GraphEngine>(new GraphEngine());
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [createModal, setCreateModal] = useState<CreateModalState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    content: '',
  });
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  useEffect(() => {
    const engine = engineRef.current;
    const unsubscribe = engine.subscribe(() => {
      setCards(engine.getAllCards());
      setConnections(engine.getAllConnections());
    });
    setCards(engine.getAllCards());
    setConnections(engine.getAllConnections());

    fetch('/api/cards')
      .then((res) => res.json())
      .then((state: AppState) => {
        engine.loadAppState(state);
      })
      .catch(() => {
        console.log('Using local state, backend not available');
      });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (newlyCreatedId) {
      const timer = setTimeout(() => setNewlyCreatedId(null), 400);
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedId]);

  const handleBlankClick = useCallback((worldX: number, worldY: number) => {
    setCreateModal({
      visible: true,
      x: worldX,
      y: worldY,
      title: '',
      content: '',
    });
  }, []);

  const handleCreateConfirm = useCallback(() => {
    if (!createModal.title.trim() && !createModal.content.trim()) {
      setCreateModal((m) => ({ ...m, visible: false }));
      return;
    }
    const engine = engineRef.current;
    const card = engine.addCard({
      title: createModal.title.trim() || '无标题笔记',
      content: createModal.content.trim(),
      position: { x: createModal.x, y: createModal.y },
    });
    setNewlyCreatedId(card.id);
    setCreateModal({ visible: false, x: 0, y: 0, title: '', content: '' });
  }, [createModal]);

  const handleCreateCancel = useCallback(() => {
    setCreateModal({ visible: false, x: 0, y: 0, title: '', content: '' });
  }, []);

  const handleSaveJSON = useCallback(async () => {
    const engine = engineRef.current;
    const json = engine.exportToJSON();
    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
    } catch (e) {
      console.log('Save to backend failed, downloading instead');
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-graph-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleAddNoteClick = useCallback(() => {
    const offsetX = (window.innerWidth / 2 - 100) / zoom;
    const offsetY = (window.innerHeight / 2 - 150) / zoom;
    setCreateModal({
      visible: true,
      x: offsetX,
      y: offsetY,
      title: '',
      content: '',
    });
  }, [zoom]);

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.logo}>📊 可视化笔记图谱</span>
        </div>
        <div style={styles.toolbarCenter}>
          <button style={styles.toolbarBtn} onClick={handleAddNoteClick}>
            ➕ 添加笔记
          </button>
          <button style={styles.toolbarBtn} onClick={handleSaveJSON}>
            💾 保存为JSON
          </button>
        </div>
        <div style={styles.toolbarRight}>
          <span style={styles.zoomLabel}>缩放: {Math.round(zoom * 100)}%</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={styles.zoomSlider}
          />
        </div>
      </div>

      <ConnectionCanvas
        cards={cards}
        connections={connections}
        zoom={zoom}
        onZoomChange={setZoom}
        onBlankClick={handleBlankClick}
        engine={engineRef.current}
        newlyCreatedId={newlyCreatedId}
      />

      {createModal.visible && (
        <>
          <div style={styles.overlay} onClick={handleCreateCancel} />
          <div style={{
            ...styles.modal,
            animation: 'modalPop 0.2s ease-out',
          }}>
            <div style={styles.modalTitle}>创建新卡片</div>
            <input
              type="text"
              placeholder="标题..."
              value={createModal.title}
              onChange={(e) => setCreateModal((m) => ({ ...m, title: e.target.value }))}
              style={styles.modalInput}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
            />
            <textarea
              placeholder="内容...（支持多行）"
              value={createModal.content}
              onChange={(e) => setCreateModal((m) => ({ ...m, content: e.target.value }))}
              style={styles.modalTextarea}
            />
            <div style={styles.modalButtons}>
              <button style={{ ...styles.modalBtn, ...styles.modalBtnCancel }} onClick={handleCreateCancel}>
                取消
              </button>
              <button style={{ ...styles.modalBtn, ...styles.modalBtnConfirm }} onClick={handleCreateConfirm}>
                确认创建
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes modalPop {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.6); }
          50% { box-shadow: 0 0 0 6px rgba(74, 144, 217, 0); }
        }
        @keyframes floaty {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; }
          60% { transform: scale(1.03) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    background: '#f5f7fa',
  },
  toolbar: {
    height: 56,
    background: '#2C3E50',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 100,
    flexShrink: 0,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  toolbarCenter: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  toolbarBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '8px 18px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  zoomLabel: {
    fontSize: 13,
    opacity: 0.9,
    minWidth: 60,
    textAlign: 'right',
  },
  zoomSlider: {
    width: 120,
    cursor: 'pointer',
    accentColor: '#4A90D9',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 420,
    background: '#ffffff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: 4,
  },
  modalInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e0e6ed',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border 0.2s',
    fontFamily: 'inherit',
  },
  modalTextarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e0e6ed',
    borderRadius: 8,
    fontSize: 14,
    minHeight: 100,
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  modalBtnCancel: {
    background: '#f0f2f5',
    color: '#606770',
  },
  modalBtnConfirm: {
    background: '#4A90D9',
    color: '#fff',
  },
};

export default App;
