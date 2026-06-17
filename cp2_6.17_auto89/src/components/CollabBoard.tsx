import React, { useState, useEffect, useCallback, useRef } from 'react';
import CardComponent, { CardData } from './Card';
import { connect, send, onMessage, disconnect } from '../utils/websocket';

interface Category {
  id: string;
  name: string;
  cardIds: string[];
}

interface User {
  id: string;
  nickname: string;
}

interface LogEntry {
  id: string;
  nickname: string;
  action: string;
  timestamp: number;
}

interface RoomState {
  id: string;
  categories: Category[];
  cards: CardData[];
  users: User[];
  logs: LogEntry[];
}

const CATEGORY_COLORS = [
  '#e8f4f8', '#f0f8e8', '#f8f0e8', '#f0e8f8',
  '#e8f0f8', '#f8e8f0', '#e8f8f0', '#f8f8e8',
  '#e8e8f8', '#f8e8e8', '#e8f8e8', '#f0f0e8',
];

type AppScreen = 'lobby' | 'board';

const CollabBoard: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('lobby');
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [userId, setUserId] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(true);

  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverTarget, setHoverTarget] = useState<{ categoryId: string; index: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showExport, setShowExport] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMessage((msg) => {
      if (msg.type === 'joined') {
        setUserId(msg.userId);
        setRoomState(msg.roomState);
        setLogs(msg.roomState.logs || []);
        return;
      }
      if (msg.roomState) {
        setRoomState(msg.roomState);
      }
      if (msg.type === 'card_moved' || msg.type === 'card_added' || msg.type === 'card_deleted' ||
          msg.type === 'card_updated' || msg.type === 'category_added' || msg.type === 'category_removed' ||
          msg.type === 'user_joined' || msg.type === 'user_left') {
        if (msg.roomState?.logs) {
          setLogs(msg.roomState.logs);
        }
      }
    });
  }, []);

  const handleJoin = useCallback(async () => {
    if (!nickname.trim()) return;
    if (isCreating) {
      try {
        const res = await fetch('http://localhost:3001/api/rooms', { method: 'POST' });
        const data = await res.json();
        setRoomId(data.roomId);
        connect(data.roomId, nickname.trim());
        setScreen('board');
      } catch {
        alert('创建房间失败');
      }
    } else {
      if (!roomId.trim()) return;
      try {
        const res = await fetch(`http://localhost:3001/api/rooms/${roomId.trim()}`);
        if (!res.ok) {
          alert('房间不存在');
          return;
        }
        connect(roomId.trim(), nickname.trim());
        setScreen('board');
      } catch {
        alert('加入房间失败');
      }
    }
  }, [nickname, roomId, isCreating]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!roomState || !boardRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('.category-container') || target.closest('.card')) return;
      const firstCategory = roomState.categories[0];
      if (!firstCategory) return;
      send({ type: 'add_card', categoryId: firstCategory.id });
    },
    [roomState]
  );

  const handleDragStart = useCallback((e: React.MouseEvent, cardId: string) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragCardId(cardId);
  }, []);

  useEffect(() => {
    if (!dragCardId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });

      const categories = document.querySelectorAll('.category-container');
      let found = false;

      categories.forEach((catEl) => {
        const rect = catEl.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = true;
          const catId = (catEl as HTMLElement).dataset.categoryId!;
          const cardEls = catEl.querySelectorAll('.card');
          let insertIndex = cardEls.length;

          for (let i = 0; i < cardEls.length; i++) {
            const cardRect = cardEls[i].getBoundingClientRect();
            if (e.clientY < cardRect.top + cardRect.height / 2) {
              insertIndex = i;
              break;
            }
          }

          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = setTimeout(() => {
            setHoverTarget({ categoryId: catId, index: insertIndex });
          }, 500);
        }
      });

      if (!found && hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
        setHoverTarget(null);
      }
    };

    const handleMouseUp = () => {
      if (dragCardId && hoverTarget) {
        send({
          type: 'move_card',
          cardId: dragCardId,
          targetCategoryId: hoverTarget.categoryId,
          targetIndex: hoverTarget.index,
        });
      }
      setDragCardId(null);
      setHoverTarget(null);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragCardId, hoverTarget]);

  const handleUpdateCard = useCallback((cardId: string, updates: Partial<Pick<CardData, 'title' | 'tags' | 'note'>>) => {
    send({ type: 'update_card', cardId, updates });
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    send({ type: 'delete_card', cardId });
  }, []);

  const handleAddCategory = useCallback(() => {
    if (!newCategoryName.trim() || newCategoryName.length > 10) return;
    send({ type: 'add_category', name: newCategoryName.trim() });
    setNewCategoryName('');
    setShowNewCategory(false);
  }, [newCategoryName]);

  const handleRemoveCategory = useCallback((categoryId: string) => {
    send({ type: 'remove_category', categoryId });
  }, []);

  const getCardById = useCallback(
    (cardId: string): CardData | undefined => {
      return roomState?.cards.find((c) => c.id === cardId);
    },
    [roomState]
  );

  const getCategoryColor = useCallback((index: number) => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  }, []);

  const generateExport = useCallback(() => {
    if (!roomState) return {};
    const report: any = {
      roomId: roomState.id,
      exportedAt: new Date().toISOString(),
      categories: roomState.categories.map((cat) => ({
        name: cat.name,
        cards: cat.cardIds.map((cardId) => {
          const card = roomState.cards.find((c) => c.id === cardId);
          return card
            ? { title: card.title, tags: card.tags, note: card.note }
            : null;
        }).filter(Boolean),
      })),
    };
    return report;
  }, [roomState]);

  const handleCopyExport = useCallback(() => {
    const report = generateExport();
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }, [generateExport]);

  const handleDownloadExport = useCallback(() => {
    const report = generateExport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `co-brainstorm-${roomState?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generateExport, roomState]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  if (screen === 'lobby') {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h1 className="lobby-title">Co-Brainstorm</h1>
          <p className="lobby-subtitle">团队协同卡片分类与观点聚合</p>
          <input
            className="lobby-input"
            placeholder="输入昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
          <div className="lobby-toggle">
            <button
              className={`lobby-toggle-btn ${isCreating ? 'active' : ''}`}
              onClick={() => setIsCreating(true)}
            >
              创建房间
            </button>
            <button
              className={`lobby-toggle-btn ${!isCreating ? 'active' : ''}`}
              onClick={() => setIsCreating(false)}
            >
              加入房间
            </button>
          </div>
          {!isCreating && (
            <input
              className="lobby-input"
              placeholder="输入房间号"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              maxLength={6}
            />
          )}
          <button className="lobby-join-btn" onClick={handleJoin} disabled={!nickname.trim()}>
            {isCreating ? '创建并加入' : '加入房间'}
          </button>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return <div className="loading">连接中...</div>;
  }

  return (
    <div className="board-wrapper">
      <nav className="top-nav">
        <div className="nav-left">
          <span className="room-code">{roomState.id}</span>
          <span className="nav-divider">|</span>
          <span className="online-indicator">
            <span className="online-dot" />
            {roomState.users.length}
          </span>
        </div>
        <div className="nav-right">
          <button className="export-btn" onClick={() => setShowExport(true)}>
            导出报告
          </button>
        </div>
      </nav>

      <div className="board-area" ref={boardRef} onDoubleClick={handleDoubleClick}>
        <div className="categories-scroll">
          {roomState.categories.map((cat, catIdx) => (
            <div
              key={cat.id}
              className="category-container"
              data-category-id={cat.id}
            >
              <div className="category-header">
                <span className="category-name">{cat.name}</span>
                <button
                  className="category-delete-btn"
                  onClick={() => handleRemoveCategory(cat.id)}
                  title="删除分类"
                >
                  ×
                </button>
              </div>
              <div className="category-cards">
                {cat.cardIds.map((cardId, idx) => {
                  const card = getCardById(cardId);
                  if (!card) return null;
                  const isDraggingThis = dragCardId === cardId;
                  return (
                    <React.Fragment key={cardId}>
                      {hoverTarget &&
                        hoverTarget.categoryId === cat.id &&
                        hoverTarget.index === idx && (
                          <div className="drop-placeholder" />
                        )}
                      <CardComponent
                        card={card}
                        categoryColor={getCategoryColor(catIdx)}
                        isDragging={isDraggingThis}
                        onDragStart={handleDragStart}
                        onUpdate={handleUpdateCard}
                        onDelete={handleDeleteCard}
                      />
                    </React.Fragment>
                  );
                })}
                {hoverTarget &&
                  hoverTarget.categoryId === cat.id &&
                  hoverTarget.index === cat.cardIds.length && (
                    <div className="drop-placeholder" />
                  )}
              </div>
            </div>
          ))}

          <div className="add-category-wrapper">
            {showNewCategory ? (
              <div className="add-category-form">
                <input
                  className="add-category-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value.slice(0, 10))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="分类名（最多10字）"
                  autoFocus
                />
                <button className="add-category-confirm" onClick={handleAddCategory}>
                  ✓
                </button>
                <button
                  className="add-category-cancel"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button className="add-category-btn" onClick={() => setShowNewCategory(true)}>
                + 新建分类
              </button>
            )}
          </div>
        </div>
      </div>

      {dragCardId && (
        <div
          className="drag-ghost"
          style={{
            left: dragPos.x - dragOffset.x,
            top: dragPos.y - dragOffset.y,
          }}
        >
          {(() => {
            const card = getCardById(dragCardId);
            if (!card) return null;
            return (
              <div className="card drag-ghost-card">
                <div className="card-header">
                  <span className="card-title">{card.title}</span>
                </div>
                {card.tags.length > 0 && (
                  <div className="card-tags">
                    {card.tags.map((tag) => (
                      <span key={tag} className="card-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className={`log-panel ${logsOpen ? 'open' : 'collapsed'}`}>
        <button className="log-toggle" onClick={() => setLogsOpen(!logsOpen)}>
          {logsOpen ? '▼' : '◀'}
        </button>
        {logsOpen && (
          <div className="log-content">
            <div className="log-title">操作记录</div>
            <div className="log-list">
              {logs.slice(-20).map((log) => (
                <div key={log.id} className="log-entry">
                  <span className="log-text">
                    {log.nickname} {log.action}
                  </span>
                  <span className="log-time">{formatTime(log.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>聚合报告</h2>
              <button className="modal-close" onClick={() => setShowExport(false)}>×</button>
            </div>
            <pre className="export-json">
              {JSON.stringify(generateExport(), null, 2)}
            </pre>
            <div className="modal-actions">
              <button className="modal-btn" onClick={handleCopyExport}>复制</button>
              <button className="modal-btn" onClick={handleDownloadExport}>下载 JSON</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollabBoard;
