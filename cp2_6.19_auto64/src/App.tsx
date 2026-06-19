import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NoteCard as NoteCardType, Connection, AppState, Position } from './types';
import { GraphEngine } from './GraphEngine';
import ConnectionCanvas from './ConnectionCanvas';

const App: React.FC = () => {
  const engineRef = useRef(new GraphEngine());
  const [cards, setCards] = useState<NoteCardType[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [scale, setScale] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalPosition, setCreateModalPosition] = useState<Position | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const syncFromEngine = useCallback(() => {
    setCards(engineRef.current.getAllCards());
    setConnections(engineRef.current.getAllConnections());
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const res = await fetch('/api/cards');
        const data = (await res.json()) as AppState;
        engineRef.current.loadState(data);
      } catch (e) {
        console.warn('加载后端数据失败，使用空状态');
      }
      syncFromEngine();
      setIsLoading(false);
    };
    loadInitialData();
  }, [syncFromEngine]);

  useEffect(() => {
    if (isCreateModalOpen && titleInputRef.current) {
      const timer = setTimeout(() => titleInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isCreateModalOpen]);

  const handleCanvasClick = useCallback((position: Position) => {
    setCreateModalPosition(position);
    setIsCreateModalOpen(true);
    setNewTitle('');
    setNewContent('');
  }, []);

  const handleCreateCard = useCallback(() => {
    if (!createModalPosition) return;
    const title = newTitle.trim() || '未命名笔记';
    const content = newContent.trim();
    const card = engineRef.current.addCard(title, content, createModalPosition);
    setCards(engineRef.current.getAllCards());
    setIsCreateModalOpen(false);
    setCreateModalPosition(null);
    setNewTitle('');
    setNewContent('');
  }, [createModalPosition, newTitle, newContent]);

  const handleAddConnection = useCallback((sourceId: string, targetId: string) => {
    const conn = engineRef.current.addConnection(sourceId, targetId);
    if (conn) {
      setConnections(engineRef.current.getAllConnections());
    }
  }, []);

  const handleUpdateConnectionLabel = useCallback((id: string, label: string) => {
    engineRef.current.updateConnectionLabel(id, label);
    setConnections(engineRef.current.getAllConnections());
  }, []);

  const handleToolbarAddCard = useCallback(() => {
    const rect = document.querySelector('.canvas-bg')?.getBoundingClientRect();
    const w = rect?.width || window.innerWidth;
    const h = rect?.height || window.innerHeight;
    const centerX = (w / 2 - 110) / scale;
    const centerY = (h / 2 - 60) / scale;
    handleCanvasClick({ x: centerX, y: centerY });
  }, [handleCanvasClick, scale]);

  const handleSaveToJSON = useCallback(async () => {
    const state = engineRef.current.getState();
    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {
      console.warn('上传到后端失败');
    }
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    a.download = `note-graph-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const buttonHoverStyle = {
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer'
  };

  const onButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
  };

  const onButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0) scale(1)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes cardBounceIn {
          0% {
            transform: scale(0.8) translateY(10px);
            opacity: 0;
          }
          60% {
            transform: scale(1.03) translateY(-4px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes breathing {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.4);
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 0 6px rgba(74, 144, 217, 0.1);
            opacity: 0.7;
          }
        }
        @keyframes modalZoomIn {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: '#2C3E50',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          zIndex: 1000,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginRight: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: 22 }}>🧠</span>
          <span>可视化笔记图谱</span>
        </div>

        <button
          onClick={handleToolbarAddCard}
          onMouseEnter={onButtonMouseEnter}
          onMouseLeave={onButtonMouseLeave}
          style={{
            ...buttonHoverStyle,
            background: '#4A90D9',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <span style={{ fontSize: 16 }}>+</span>
          添加笔记
        </button>

        <button
          onClick={handleSaveToJSON}
          onMouseEnter={onButtonMouseEnter}
          onMouseLeave={onButtonMouseLeave}
          style={{
            ...buttonHoverStyle,
            background: '#96CEB4',
            color: '#2C3E50',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          💾 保存为 JSON
        </button>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(255,255,255,0.1)',
            padding: '8px 16px',
            borderRadius: 8
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.85 }}>缩放</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{
              width: 140,
              accentColor: '#4A90D9',
              cursor: 'pointer'
            }}
          />
          <span
            style={{
              fontSize: 13,
              minWidth: 48,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              opacity: 0.9
            }}
          >
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {!isLoading && (
        <ConnectionCanvas
          cards={cards}
          connections={connections}
          engine={engineRef.current}
          scale={scale}
          onScaleChange={setScale}
          onCanvasClick={handleCanvasClick}
          onCardsChange={setCards}
          onConnectionsChange={setConnections}
          onAddConnection={handleAddConnection}
          onUpdateConnectionLabel={handleUpdateConnectionLabel}
        />
      )}

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F8FAFC',
            zIndex: 999
          }}
        >
          <div style={{ fontSize: 16, color: '#2C3E50' }}>加载中...</div>
        </div>
      )}

      {isCreateModalOpen && (
        <>
          <div
            onClick={() => setIsCreateModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(44, 62, 80, 0.45)',
              zIndex: 2000,
              animation: 'overlayFadeIn 0.2s ease',
              backdropFilter: 'blur(3px)'
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2001,
              width: 400,
              background: 'white',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              animation: 'modalZoomIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#2C3E50',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              📝 创建新笔记卡片
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#5A6C7D',
                  marginBottom: 6,
                  fontWeight: 500
                }}
              >
                标题
              </label>
              <input
                ref={titleInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCard();
                }}
                placeholder="输入笔记标题..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4A90D9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#5A6C7D',
                  marginBottom: 6,
                  fontWeight: 500
                }}
              >
                内容
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleCreateCard();
                  }
                }}
                placeholder="输入笔记内容（支持换行）..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4A90D9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10
              }}
            >
              <button
                onClick={() => setIsCreateModalOpen(false)}
                onMouseEnter={onButtonMouseEnter}
                onMouseLeave={onButtonMouseLeave}
                style={{
                  ...buttonHoverStyle,
                  background: '#F1F5F9',
                  color: '#5A6C7D',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateCard}
                onMouseEnter={onButtonMouseEnter}
                onMouseLeave={onButtonMouseLeave}
                style={{
                  ...buttonHoverStyle,
                  background: '#4A90D9',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(74, 144, 217, 0.35)'
                }}
              >
                确认创建
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
