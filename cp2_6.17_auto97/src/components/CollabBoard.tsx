import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from './Card';
import {
  websocketManager,
  CardData,
  CategoryData,
  UserData,
  LogEntryData,
  RoomStateData,
} from '../utils/websocket';

interface DragState {
  isDragging: boolean;
  cardId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  sourceCategoryId: string | null;
  targetCategoryId: string | null;
  targetPosition: number;
  hoverStartTime: number;
  hoverCategoryId: string | null;
  rafPending: boolean;
}

interface LogItemState {
  id: string;
  log: LogEntryData;
  visible: boolean;
}

export const CollabBoard: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [rawLogs, setRawLogs] = useState<LogEntryData[]>([]);
  const [logItems, setLogItems] = useState<LogItemState[]>([]);
  const [logPanelCollapsed, setLogPanelCollapsed] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameCategoryId, setRenameCategoryId] = useState<string | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [, forceRender] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    cardId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    currentX: 0,
    currentY: 0,
    sourceCategoryId: null,
    targetCategoryId: null,
    targetPosition: 0,
    hoverStartTime: 0,
    hoverCategoryId: null,
    rafPending: false,
  });
  const dragElRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const logTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.position - b.position);
  }, [categories]);

  const getCardsByCategory = useCallback(
    (categoryId: string): CardData[] => {
      return cards
        .filter((c) => c.categoryId === categoryId)
        .sort((a, b) => a.position - b.position);
    },
    [cards],
  );

  const triggerLogStaggered = useCallback((newLogs: LogEntryData[]) => {
    logTimersRef.current.forEach((timer) => clearTimeout(timer));
    logTimersRef.current.clear();

    setLogItems(
      newLogs.map((log) => ({
        id: log.id,
        log,
        visible: false,
      })),
    );

    newLogs.forEach((log, idx) => {
      const timer = setTimeout(() => {
        setLogItems((prev) =>
          prev.map((item) =>
            item.id === log.id ? { ...item, visible: true } : item,
          ),
        );
        logTimersRef.current.delete(log.id);
      }, idx * 500);
      logTimersRef.current.set(log.id, timer);
    });
  }, []);

  const appendLog = useCallback((log: LogEntryData) => {
    setRawLogs((prev) => {
      const next = [...prev, log].slice(-20);
      setLogItems((prevItems) => {
        const newItem: LogItemState = { id: log.id, log, visible: false };
        const items = [...prevItems, newItem].slice(-20);
        const timer = setTimeout(() => {
          setLogItems((curr) =>
            curr.map((item) =>
              item.id === log.id ? { ...item, visible: true } : item,
            ),
          );
          logTimersRef.current.delete(log.id);
        }, 50);
        logTimersRef.current.set(log.id, timer);
        return items;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const unsub1 = websocketManager.on('connected', () => setIsConnected(true));
    const unsub2 = websocketManager.on('disconnected', () => setIsConnected(false));
    const unsub3 = websocketManager.on('reconnecting', (data: any) => {
      console.log('Reconnecting...', data);
    });

    const unsub4 = websocketManager.on('room_state', (state: RoomStateData) => {
      setCards(state.cards || []);
      setCategories(state.categories || []);
      setUsers(state.users || []);
      setRawLogs(state.logs || []);
      triggerLogStaggered(state.logs || []);
    });

    const unsub5 = websocketManager.on('users_updated', (newUsers: UserData[]) => {
      setUsers(newUsers);
    });

    const unsub6 = websocketManager.on('log_added', (log: LogEntryData) => {
      appendLog(log);
    });

    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
      unsub5?.();
      unsub6?.();
      logTimersRef.current.forEach((timer) => clearTimeout(timer));
      logTimersRef.current.clear();
    };
  }, [triggerLogStaggered, appendLog]);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }
    setIsJoining(true);
    try {
      await websocketManager.connect();
      const result = await websocketManager.createRoom(nickname.trim().substring(0, 20));
      setRoomId(result.roomId);
      setCurrentUser({ id: result.userId, nickname: result.nickname });
    } catch (err: any) {
      alert(err.message || '创建房间失败');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }
    if (!roomIdInput.trim()) {
      alert('请输入房间号');
      return;
    }
    setIsJoining(true);
    try {
      await websocketManager.connect();
      const result = await websocketManager.joinRoom(roomIdInput.trim(), nickname.trim().substring(0, 20));
      setRoomId(result.roomId);
      setCurrentUser({ id: result.userId, nickname: result.nickname });
    } catch (err: any) {
      alert(err.message || '加入房间失败');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDoubleClickBoard = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (categories.length === 0) return;
    websocketManager.addCard(categories[0].id).catch((err) => {
      console.error('Failed to add card:', err);
    });
  };

  const handleEditCard = useCallback(
    (cardId: string, updates: Partial<Omit<CardData, 'id' | 'createdAt' | 'createdBy'>>) => {
      websocketManager.updateCard(cardId, updates).catch((err) => {
        console.error('Failed to update card:', err);
      });
    },
    [],
  );

  const handleDeleteCard = useCallback((cardId: string) => {
    websocketManager.deleteCard(cardId).catch((err) => {
      console.error('Failed to delete card:', err);
    });
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent, cardId: string, cardEl: HTMLElement) => {
    const rect = cardEl.getBoundingClientRect();
    const ds = dragStateRef.current;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    ds.isDragging = true;
    ds.cardId = cardId;
    ds.startX = e.clientX;
    ds.startY = e.clientY;
    ds.currentX = e.clientX;
    ds.currentY = e.clientY;
    ds.offsetX = e.clientX - rect.left;
    ds.offsetY = e.clientY - rect.top;
    ds.sourceCategoryId = card.categoryId;
    ds.targetCategoryId = card.categoryId;
    ds.targetPosition = card.position;
    ds.hoverStartTime = 0;
    ds.hoverCategoryId = null;
    ds.rafPending = false;

    if (!dragElRef.current) {
      dragElRef.current = document.createElement('div');
      dragElRef.current.style.position = 'fixed';
      dragElRef.current.style.pointerEvents = 'none';
      dragElRef.current.style.zIndex = '9999';
      dragElRef.current.style.transform = 'rotate(2deg)';
      dragElRef.current.style.willChange = 'left, top';
      document.body.appendChild(dragElRef.current);
    }

    const clone = cardEl.cloneNode(true) as HTMLElement;
    clone.style.width = '200px';
    clone.style.margin = '0';
    clone.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)';
    clone.style.opacity = '0.95';
    clone.style.transform = 'scale(1.05)';
    clone.style.pointerEvents = 'none';
    dragElRef.current.innerHTML = '';
    dragElRef.current.appendChild(clone);
    dragElRef.current.style.left = `${e.clientX - ds.offsetX}px`;
    dragElRef.current.style.top = `${e.clientY - ds.offsetY}px`;

    forceRender((n) => n + 1);
  }, [cards]);

  const performDragFrame = useCallback(() => {
    const ds = dragStateRef.current;
    ds.rafPending = false;

    if (!ds.isDragging || !ds.cardId) return;

    if (dragElRef.current) {
      dragElRef.current.style.left = `${ds.currentX - ds.offsetX}px`;
      dragElRef.current.style.top = `${ds.currentY - ds.offsetY}px`;
    }

    let hoveredCategoryId: string | null = null;
    let insertIndex = -1;

    for (const [catId, catEl] of categoryRefs.current) {
      const rect = catEl.getBoundingClientRect();
      if (
        ds.currentX >= rect.left &&
        ds.currentX <= rect.right &&
        ds.currentY >= rect.top &&
        ds.currentY <= rect.bottom
      ) {
        hoveredCategoryId = catId;
        const cardsContainer = catEl.querySelector('.category-cards');
        if (cardsContainer) {
          const cardEls = cardsContainer.querySelectorAll<HTMLElement>(':scope > .card-slot');
          insertIndex = cardEls.length;
          for (let i = 0; i < cardEls.length; i++) {
            const cardRect = cardEls[i].getBoundingClientRect();
            if (ds.currentY < cardRect.top + cardRect.height / 2) {
              insertIndex = i;
              break;
            }
          }
        }
        break;
      }
    }

    if (hoveredCategoryId !== ds.hoverCategoryId) {
      ds.hoverCategoryId = hoveredCategoryId;
      ds.hoverStartTime = hoveredCategoryId ? Date.now() : 0;
    }

    let needsRender = false;
    if (hoveredCategoryId) {
      const now = Date.now();
      if (hoveredCategoryId !== ds.targetCategoryId) {
        ds.targetCategoryId = hoveredCategoryId;
        ds.targetPosition = insertIndex >= 0 ? insertIndex : 0;
        needsRender = true;
      } else if (now - ds.hoverStartTime >= 500 && insertIndex !== ds.targetPosition && insertIndex >= 0) {
        ds.targetPosition = insertIndex;
        needsRender = true;
      }
    }

    if (needsRender) {
      forceRender((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds.isDragging || !ds.cardId) return;

      ds.currentX = e.clientX;
      ds.currentY = e.clientY;

      if (!ds.rafPending) {
        ds.rafPending = true;
        requestAnimationFrame(performDragFrame);
      }
    };

    const handleMouseUp = () => {
      const ds = dragStateRef.current;
      if (!ds.isDragging || !ds.cardId) return;

      if (ds.sourceCategoryId !== ds.targetCategoryId || ds.targetPosition !== -1) {
        websocketManager.moveCard(ds.cardId, ds.targetCategoryId || ds.sourceCategoryId!, ds.targetPosition).catch((err) => {
          console.error('Failed to move card:', err);
        });
      }

      ds.isDragging = false;
      ds.cardId = null;
      ds.sourceCategoryId = null;
      ds.targetCategoryId = null;
      ds.hoverCategoryId = null;
      ds.hoverStartTime = 0;
      ds.rafPending = false;

      if (dragElRef.current) {
        dragElRef.current.remove();
        dragElRef.current = null;
      }

      forceRender((n) => n + 1);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [performDragFrame]);

  const handleAddCategory = () => {
    const name = newCategoryName.trim().substring(0, 10);
    if (!name) {
      alert('请输入分类名称');
      return;
    }
    websocketManager.addCategory(name).catch((err) => {
      alert(err.message || '创建分类失败');
    });
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (categories.length <= 1) {
      alert('至少需要保留一个分类');
      return;
    }
    if (!confirm(`确定要删除分类「${cat.name}」吗？该分类下的卡片将移动到第一个分类中。`)) return;
    websocketManager.deleteCategory(categoryId).catch((err) => {
      alert(err.message || '删除分类失败');
    });
  };

  const handleRenameCategory = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    setRenameCategoryId(categoryId);
    setRenameCategoryName(cat.name);
  };

  const confirmRenameCategory = () => {
    if (!renameCategoryId) return;
    const name = renameCategoryName.trim().substring(0, 10);
    if (!name) {
      alert('分类名称不能为空');
      return;
    }
    websocketManager.updateCategory(renameCategoryId, name).catch((err) => {
      alert(err.message || '重命名失败');
    });
    setRenameCategoryId(null);
    setRenameCategoryName('');
  };

  const exportReport = useMemo(() => {
    const result: any = {
      roomId,
      exportTime: new Date().toISOString(),
      totalCards: cards.length,
      totalCategories: categories.length,
      categories: sortedCategories.map((cat) => {
        const catCards = getCardsByCategory(cat.id);
        return {
          id: cat.id,
          name: cat.name,
          cardCount: catCards.length,
          cards: catCards.map((card) => ({
            id: card.id,
            title: card.title,
            tags: card.tags,
            notes: card.notes,
            createdAt: new Date(card.createdAt).toLocaleString(),
          })),
        };
      }),
    };
    return result;
  }, [roomId, cards, categories, sortedCategories, getCardsByCategory]);

  const handleCopyReport = async () => {
    const text = JSON.stringify(exportReport, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert('✅ 已复制到剪贴板');
        return;
      }
    } catch (err) {
      console.warn('Clipboard API failed, falling back:', err);
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      textarea.style.left = '-1000px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        alert('✅ 已复制到剪贴板');
      } else {
        alert('❌ 复制失败，请手动复制');
      }
    } catch {
      alert('❌ 复制失败，请手动复制');
    }
  };

  const handleDownloadReport = () => {
    const blob = new Blob([JSON.stringify(exportReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainstorm-report-${roomId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const formatLogAction = (log: LogEntryData): string => {
    let base = `${log.user} ${log.action}${log.targetName}`;
    if (log.categoryName) {
      base += ` (${log.categoryName})`;
    }
    return base;
  };

  const ds = dragStateRef.current;

  if (!roomId || !currentUser) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">🧠 Co-Brainstorm</h1>
          <p className="login-subtitle">团队协同卡片分类与观点聚合</p>

          <div className="login-form">
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (roomIdInput ? handleJoinRoom() : handleCreateRoom())}
                placeholder="请输入您的昵称"
                maxLength={20}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>房间号（加入已有房间）</label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="输入6位房间码，或留空创建新房间"
                maxLength={6}
                className="form-input"
                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
              />
            </div>

            <div className="login-buttons">
              <button className="btn btn-primary" onClick={handleCreateRoom} disabled={isJoining}>
                {isJoining ? '处理中...' : '🆕 创建新房间'}
              </button>
              <button className="btn btn-secondary" onClick={handleJoinRoom} disabled={isJoining || !roomIdInput}>
                {isJoining ? '处理中...' : '🚪 加入房间'}
              </button>
            </div>
          </div>

          <div className="login-footer">
            <p>双击白板空白区域可快速创建卡片</p>
          </div>
        </div>

        <style>{`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #12121a 0%, #0d0d14 100%);
            padding: 20px;
          }
          .login-box {
            background: rgba(30, 30, 50, 0.6);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            padding: 48px 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .login-title {
            font-size: 32px;
            color: white;
            margin: 0 0 8px 0;
            text-align: center;
            font-weight: 700;
          }
          .login-subtitle {
            color: #999;
            text-align: center;
            margin: 0 0 32px 0;
            font-size: 14px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          .form-group label {
            display: block;
            color: #ccc;
            font-size: 13px;
            margin-bottom: 8px;
            font-weight: 500;
          }
          .form-input {
            width: 100%;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 15px;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.2s ease;
          }
          .form-input:focus {
            border-color: #3b82f6;
          }
          .form-input::placeholder {
            color: #666;
          }
          .login-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 28px;
          }
          .btn {
            padding: 12px 20px;
            border-radius: 8px;
            border: none;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.1s ease;
          }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .btn-primary {
            background: #3b82f6;
            color: white;
          }
          .btn-primary:hover:not(:disabled) {
            background: #2563eb;
          }
          .btn-primary:active:not(:disabled) {
            transform: scale(0.95);
          }
          .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
          }
          .btn-secondary:active:not(:disabled) {
            transform: scale(0.95);
          }
          .login-footer {
            margin-top: 28px;
            text-align: center;
          }
          .login-footer p {
            color: #666;
            font-size: 12px;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-left">
          <span className="nav-title">🧠 Co-Brainstorm</span>
          <div className="room-code-badge">
            <span className="room-label">房间号：</span>
            <span className="room-code">{roomId}</span>
          </div>
        </div>
        <div className="nav-right">
          <div className="online-indicator">
            <span className="online-dot" />
            <span className="online-count">{users.length}</span>
          </div>
          <div className="current-user">{currentUser.nickname}</div>
          <button className="btn btn-export" onClick={() => setShowExportModal(true)}>
            📊 导出报告
          </button>
        </div>
      </nav>

      <div className="board-area" ref={boardRef} onDoubleClick={handleDoubleClickBoard}>
        <button className="btn btn-add-category" onClick={() => setShowAddCategoryModal(true)}>
          ➕ 新建分类
        </button>

        <div className="categories-scroll-container">
          <div className="categories-wrapper">
            {sortedCategories.map((category) => {
              const catCards = getCardsByCategory(category.id);
              const isTargetCategory = ds.isDragging && ds.targetCategoryId === category.id;
              return (
                <div
                  key={category.id}
                  className="category-container"
                  ref={(el) => {
                    if (el) categoryRefs.current.set(category.id, el);
                    else categoryRefs.current.delete(category.id);
                  }}
                >
                  <div className="category-header">
                    {renameCategoryId === category.id ? (
                      <div className="category-rename">
                        <input
                          type="text"
                          value={renameCategoryName}
                          onChange={(e) => setRenameCategoryName(e.target.value.substring(0, 10))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRenameCategory();
                            if (e.key === 'Escape') {
                              setRenameCategoryId(null);
                              setRenameCategoryName('');
                            }
                          }}
                          onBlur={confirmRenameCategory}
                          autoFocus
                          maxLength={10}
                          className="category-rename-input"
                        />
                      </div>
                    ) : (
                      <span className="category-name" onDoubleClick={() => handleRenameCategory(category.id)}>
                        {category.name}
                      </span>
                    )}
                    <div className="category-actions">
                      <span className="category-count">{catCards.length}</span>
                      <button
                        className="category-action-btn"
                        onClick={() => websocketManager.addCard(category.id)}
                        title="添加卡片"
                      >
                        ＋
                      </button>
                      <button
                        className="category-action-btn"
                        onClick={() => handleRenameCategory(category.id)}
                        title="重命名"
                      >
                        ✏️
                      </button>
                      <button
                        className="category-action-btn"
                        onClick={() => handleDeleteCategory(category.id)}
                        title="删除分类"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="category-cards">
                    {catCards.map((card, index) => {
                      const isGhostCard = ds.isDragging && ds.cardId === card.id;
                      const showInsertLine = isTargetCategory && index === ds.targetPosition;
                      return (
                        <React.Fragment key={card.id}>
                          {showInsertLine && <div className="insert-line" />}
                          <div className="card-slot" style={{ transition: 'transform 0.3s ease' }}>
                            <Card
                              card={card}
                              categoryColor={category.color}
                              categoryId={category.id}
                              isDragging={ds.isDragging && ds.cardId === card.id}
                              isSourceGhost={isGhostCard}
                              onEdit={handleEditCard}
                              onDelete={handleDeleteCard}
                              onDragStart={handleDragStart}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {isTargetCategory && ds.targetPosition >= catCards.length && <div className="insert-line" />}
                    {catCards.length === 0 && (
                      <div className="category-empty">
                        <p>双击空白区域创建卡片</p>
                        <p>或拖拽卡片到此处</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`log-panel ${logPanelCollapsed ? 'collapsed' : ''}`}>
        {logPanelCollapsed ? (
          <button className="log-toggle-btn" onClick={() => setLogPanelCollapsed(false)} title="展开日志">
            📜
          </button>
        ) : (
          <>
            <div className="log-panel-header">
              <span className="log-panel-title">📜 操作记录</span>
              <button className="log-close-btn" onClick={() => setLogPanelCollapsed(true)} title="折叠">
                —
              </button>
            </div>
            <div className="log-list">
              {logItems.length === 0 && <div className="log-empty">暂无操作记录</div>}
              {logItems.map(({ id, log, visible }, idx) => (
                <div
                  key={id}
                  className={`log-item ${visible ? 'log-item-visible' : ''}`}
                >
                  <span className="log-time">{formatTime(log.timestamp)}</span>
                  <span className="log-content">{formatLogAction(log)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal modal-export" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 观点聚合报告</h3>
              <div className="modal-header-actions">
                <button className="btn btn-modal btn-copy" onClick={handleCopyReport}>
                  📋 一键复制
                </button>
                <button className="btn btn-modal btn-primary" onClick={handleDownloadReport}>
                  ⬇️ 下载 JSON
                </button>
                <button className="modal-close" onClick={() => setShowExportModal(false)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-body">
              <pre className="export-json">{JSON.stringify(exportReport, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {showAddCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowAddCategoryModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ 新建分类</h3>
              <button className="modal-close" onClick={() => setShowAddCategoryModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value.substring(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="输入分类名称（最多10字）"
                maxLength={10}
                autoFocus
                className="form-input"
                style={{ width: '100%' }}
              />
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddCategoryModal(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #12121a 0%, #0d0d14 100%);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .top-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 100;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .nav-title {
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .room-code-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          padding: 6px 14px;
          border-radius: 8px;
        }

        .room-label {
          color: #93c5fd;
          font-size: 12px;
        }

        .room-code {
          color: white;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 3px;
          font-family: 'Courier New', monospace;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .online-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          padding: 4px 12px;
          border-radius: 20px;
        }

        .online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .online-count {
          color: #4ade80;
          font-size: 13px;
          font-weight: 600;
        }

        .current-user {
          color: #ccc;
          font-size: 13px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 6px;
        }

        .btn-export {
          width: 120px;
          height: 36px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .btn-export:hover {
          background: #2563eb;
        }

        .btn-export:active {
          transform: scale(0.95);
        }

        .board-area {
          margin-top: 48px;
          flex: 1;
          min-width: 768px;
          background-color: #e0e0e8;
          background-image:
            linear-gradient(#d0d0d8 1px, transparent 1px),
            linear-gradient(90deg, #d0d0d8 1px, transparent 1px);
          background-size: 40px 40px;
          position: relative;
          overflow: hidden;
        }

        .btn-add-category {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 10;
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.1s ease;
        }

        .btn-add-category:hover {
          background: #2563eb;
        }

        .btn-add-category:active {
          transform: scale(0.95);
        }

        .categories-scroll-container {
          width: 100%;
          height: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 72px 24px 24px 24px;
          box-sizing: border-box;
        }

        .categories-wrapper {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          min-height: calc(100% - 48px);
        }

        .category-container {
          width: 300px;
          min-height: 500px;
          background: #f0f0f5;
          border-radius: 16px;
          border: 2px dashed #c0c0d0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .category-container:hover {
          border-color: #3b82f6;
        }

        @media (max-width: 1024px) {
          .category-container {
            width: 250px;
          }
        }

        .category-header {
          background: #1e3a5f;
          color: white;
          padding: 12px 16px;
          border-radius: 14px 14px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .category-name {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: default;
        }

        .category-rename {
          flex: 1;
        }

        .category-rename-input {
          width: 100%;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          box-sizing: border-box;
        }

        .category-rename-input:focus {
          border-color: #93c5fd;
          background: rgba(255, 255, 255, 0.2);
        }

        .category-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .category-count {
          font-size: 12px;
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }

        .category-action-btn {
          width: 26px;
          height: 26px;
          border: none;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .category-action-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .category-cards {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 100px;
        }

        .card-slot {
          position: relative;
        }

        .insert-line {
          width: calc(100% - 8px);
          height: 30px;
          margin: 4px;
          border-left: 2px solid #3b82f6;
          border-radius: 2px;
          position: relative;
        }

        .insert-line::after {
          content: '';
          position: absolute;
          left: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          background: #3b82f6;
          border-radius: 50%;
        }

        .category-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #999;
          font-size: 12px;
          min-height: 150px;
          text-align: center;
          padding: 20px;
        }

        .category-empty p {
          margin: 0;
          opacity: 0.7;
        }

        .log-panel {
          position: fixed;
          right: 16px;
          bottom: 16px;
          width: 280px;
          background: rgba(26, 26, 46, 0.9);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          z-index: 50;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .log-panel.collapsed {
          width: auto;
          height: auto;
        }

        .log-toggle-btn {
          width: 44px;
          height: 44px;
          background: rgba(26, 26, 46, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          font-size: 20px;
          cursor: pointer;
          color: #ccc;
        }

        .log-toggle-btn:hover {
          color: white;
          background: rgba(59, 130, 246, 0.3);
        }

        .log-panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .log-panel-title {
          color: #eee;
          font-size: 13px;
          font-weight: 600;
        }

        .log-close-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #999;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .log-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .log-list {
          height: 200px;
          overflow-y: auto;
          padding: 8px 0;
        }

        .log-list::-webkit-scrollbar {
          width: 6px;
        }

        .log-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .log-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }

        .log-empty {
          text-align: center;
          color: #666;
          font-size: 12px;
          padding: 20px;
        }

        .log-item {
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-left: 2px solid transparent;
          opacity: 0;
          transform: translateX(-100%);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .log-item.log-item-visible {
          opacity: 1;
          transform: translateX(0);
        }

        .log-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-left-color: #3b82f6;
        }

        .log-time {
          color: #666;
          font-size: 10px;
          font-family: 'Courier New', monospace;
        }

        .log-content {
          color: #ccc;
          font-size: 12px;
          line-height: 1.4;
          word-break: break-word;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: overlayFadeIn 0.2s ease;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
          animation: modalFadeIn 0.3s ease;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-export {
          width: 700px;
          max-width: calc(100vw - 40px);
          height: 500px;
          max-height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
        }

        .modal-sm {
          width: 400px;
          max-width: calc(100vw - 40px);
        }

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafafa;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 16px;
          color: #1f2937;
        }

        .modal-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #6b7280;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
        }

        .modal-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-body {
          padding: 20px;
          flex: 1;
          overflow: auto;
        }

        .modal-export .modal-body {
          padding: 0;
        }

        .export-json {
          margin: 0;
          padding: 20px;
          font-size: 12px;
          line-height: 1.6;
          color: #374151;
          overflow: auto;
          max-height: 100%;
          background: #f9fafb;
          font-family: 'Consolas', 'Monaco', monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-modal {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .btn-modal:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-modal.btn-copy {
          background: #e0f2fe;
          border-color: #7dd3fc;
          color: #0369a1;
        }

        .btn-modal.btn-copy:hover {
          background: #bae6fd;
          border-color: #38bdf8;
        }

        .btn-modal.btn-primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .btn-modal.btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default CollabBoard;
