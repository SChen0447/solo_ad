import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteCard as NoteCardType, Connection as ConnectionType, AppState } from './types';
import { DEFAULT_CARD_WIDTH } from './types';
import { GraphEngine } from './GraphEngine';
import ConnectionCanvas from './ConnectionCanvas';

interface CreateCardModal {
  visible: boolean;
  position: { x: number; y: number };
  worldPosition: { x: number; y: number };
  title: string;
  content: string;
}

const App: React.FC = () => {
  const graphEngineRef = useRef<GraphEngine>(new GraphEngine());
  const [cards, setCards] = useState<NoteCardType[]>([]);
  const [connections, setConnections] = useState<ConnectionType[]>([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 100, y: 100 });
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [createModal, setCreateModal] = useState<CreateCardModal>({
    visible: false,
    position: { x: 0, y: 0 },
    worldPosition: { x: 0, y: 0 },
    title: '',
    content: '',
  });
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const syncState = useCallback(() => {
    const state = graphEngineRef.current.getState();
    setCards(state.cards);
    setConnections(state.connections);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/cards');
        if (response.ok) {
          const data = (await response.json()) as AppState;
          graphEngineRef.current = new GraphEngine(data);
          syncState();
        }
      } catch (e) {
        console.log('后端未就绪，使用空数据');
        syncState();
      }
    };
    loadData();
  }, [syncState]);

  useEffect(() => {
    if (createModal.visible && isModalAnimating && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 50);
    }
  }, [createModal.visible, isModalAnimating]);

  const handleCanvasClick = useCallback((worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => {
    setCreateModal({
      visible: true,
      position: screenPos,
      worldPosition: worldPos,
      title: '',
      content: '',
    });
    setIsModalAnimating(true);
    setTimeout(() => setIsModalAnimating(false), 200);
  }, []);

  const handleCreateCard = useCallback(() => {
    const title = createModal.title.trim() || '新建笔记';
    const content = createModal.content.trim();
    graphEngineRef.current.addCard(title, content, createModal.worldPosition);
    syncState();
    setCreateModal((prev) => ({ ...prev, visible: false }));
  }, [createModal, syncState]);

  const handleAddCardButton = useCallback(() => {
    const rect = document.querySelector('[data-canvas-container]')?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const worldX = (centerX - rect.left - offset.x) / scale;
      const worldY = (centerY - rect.top - offset.y) / scale;
      setCreateModal({
        visible: true,
        position: { x: centerX, y: centerY },
        worldPosition: { x: worldX - DEFAULT_CARD_WIDTH / 2, y: worldY - 60 },
        title: '',
        content: '',
      });
      setIsModalAnimating(true);
      setTimeout(() => setIsModalAnimating(false), 200);
    }
  }, [offset, scale]);

  const handleCardPositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    graphEngineRef.current.updateCard(id, { position });
    syncState();
  }, [syncState]);

  const handleCardColorCycle = useCallback((id: string) => {
    graphEngineRef.current.cycleCardColor(id);
    syncState();
  }, [syncState]);

  const handleCardUpdate = useCallback((id: string, updates: Partial<Omit<NoteCardType, 'id'>>) => {
    graphEngineRef.current.updateCard(id, updates);
    syncState();
  }, [syncState]);

  const handleCardDelete = useCallback((id: string) => {
    graphEngineRef.current.deleteCard(id);
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    syncState();
  }, [syncState]);

  const handleCardsDelete = useCallback((ids: string[]) => {
    graphEngineRef.current.deleteCards(ids);
    setSelectedCardIds(new Set());
    syncState();
  }, [syncState]);

  const handleAddConnection = useCallback((sourceId: string, targetId: string, label?: string) => {
    graphEngineRef.current.addConnection(sourceId, targetId, label);
    syncState();
  }, [syncState]);

  const handleConnectionLabelUpdate = useCallback((id: string, label: string) => {
    graphEngineRef.current.updateConnection(id, { label });
    syncState();
  }, [syncState]);

  const handleSaveJSON = useCallback(async () => {
    const json = graphEngineRef.current.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `note-graph-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      const state = graphEngineRef.current.getState();
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (e) {
      console.log('后端保存失败');
    }
  }, []);

  const handleScaleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    const rect = document.querySelector('[data-canvas-container]')?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const ratio = newScale / scale;
      const newOffsetX = centerX - (centerX - offset.x) * ratio;
      const newOffsetY = centerY - (centerY - offset.y) * ratio;
      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    } else {
      setScale(newScale);
    }
  }, [scale, offset]);

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
      <div
        data-canvas-container
        style={{ position: 'absolute', inset: 0 }}
      >
        <ConnectionCanvas
          cards={cards}
          connections={connections}
          scale={scale}
          offset={offset}
          selectedCardIds={selectedCardIds}
          onScaleChange={setScale}
          onOffsetChange={setOffset}
          onCardPositionChange={handleCardPositionChange}
          onCardColorCycle={handleCardColorCycle}
          onCardUpdate={handleCardUpdate}
          onCardDelete={handleCardDelete}
          onCardsDelete={handleCardsDelete}
          onAddConnection={handleAddConnection}
          onConnectionLabelUpdate={handleConnectionLabelUpdate}
          onCanvasClick={handleCanvasClick}
          onSelectionChange={setSelectedCardIds}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: 'rgba(44, 62, 80, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          zIndex: 1000,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ color: 'white', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span>可视化笔记图谱</span>
        </div>

        <button
          onClick={handleAddCardButton}
          style={buttonStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.25)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.15)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: 14 }}>➕</span>
          添加笔记
        </button>

        <button
          onClick={handleSaveJSON}
          style={buttonStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.25)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.15)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: 14 }}>💾</span>
          保存 JSON
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, whiteSpace: 'nowrap' }}>
            缩放: {Math.round(scale * 100)}%
          </span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.01}
            value={scale}
            onChange={handleScaleSliderChange}
            style={{
              width: 140,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.2)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              WebkitAppearance: 'none',
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 72,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 11,
          color: '#666',
          lineHeight: 1.7,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          zIndex: 500,
          maxWidth: 200,
        }}
      >
        <div style={{ fontWeight: 600, color: '#2C3E50', marginBottom: 4 }}>操作提示</div>
        <div>🖱️ 滚轮缩放画布</div>
        <div>🖐️ 中键/Alt+左键平移</div>
        <div>⌨️ Ctrl+左键框选多选</div>
        <div>✏️ 双击卡片编辑内容</div>
        <div>🔗 拖拽底部圆点连线</div>
        <div>🗑️ Delete键删除选中</div>
      </div>

      {createModal.visible && (
        <>
          <div
            onClick={() => setCreateModal((prev) => ({ ...prev, visible: false }))}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(2px)',
              zIndex: 2000,
              animation: 'fadeIn 0.2s ease forwards',
            }}
          />
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalPopIn {
              from {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 0;
              }
              to {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
              }
            }
            @keyframes inputFocus {
              from { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0); }
              to { box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.2); }
            }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) scale(1)',
              width: 380,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.12)',
              padding: 24,
              zIndex: 2001,
              animation: 'modalPopIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2C3E50', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📝</span>
              创建新笔记卡片
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 500 }}>标题</div>
              <input
                ref={titleInputRef}
                type="text"
                value={createModal.title}
                onChange={(e) => setCreateModal((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="输入卡片标题..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateCard();
                  }
                  if (e.key === 'Escape') {
                    setCreateModal((prev) => ({ ...prev, visible: false }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E0E0E0',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4A90D9';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74, 144, 217, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 500 }}>内容</div>
              <textarea
                value={createModal.content}
                onChange={(e) => setCreateModal((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="输入卡片内容，可包含文字、列表..."
                rows={5}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCreateModal((prev) => ({ ...prev, visible: false }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E0E0E0',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 100,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4A90D9';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74, 144, 217, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCreateModal((prev) => ({ ...prev, visible: false }))}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid #E0E0E0',
                  background: 'white',
                  color: '#666',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLElement).style.background = '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.background = 'white';
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateCard}
                style={{
                  padding: '8px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(74, 144, 217, 0.3)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(74, 144, 217, 0.45)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(74, 144, 217, 0.3)';
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
