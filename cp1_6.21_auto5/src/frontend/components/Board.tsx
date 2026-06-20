import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  Board as BoardType,
  Card as CardType,
  User,
  Comment,
  CardType as CardTypeEnum,
  Position,
  CardData,
} from '../types';
import Card from './Card';
import CommentPanel from './CommentPanel';

interface BoardProps {
  boardId: string;
  socket: Socket;
  currentUser: User;
}

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

interface DragState {
  cardId: string;
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
}

interface AlignGuides {
  x: number | null;
  y: number | null;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const SCALE_STEP = 0.08;
const SNAP_THRESHOLD = 8;

const Board: React.FC<BoardProps> = ({ boardId, socket, currentUser }) => {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [alignGuides, setAlignGuides] = useState<AlignGuides>({ x: null, y: null });
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [commentCardId, setCommentCardId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; vpX: number; vpY: number } | null>(null);
  const pendingUpdatesRef = useRef<Map<string, Position>>(new Map());
  const updateFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_board', { boardId, user: currentUser });

    socket.on('board_state', (boardData: BoardType) => {
      setBoard(boardData);
    });

    socket.on('card_added', ({ card }: { card: CardType }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, cards: [...prev.cards, card], updatedAt: Date.now() };
      });
    });

    socket.on('card_updated', ({ card }: { card: CardType }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) => (c.id === card.id ? card : c)),
          updatedAt: Date.now(),
        };
      });
    });

    socket.on('card_deleted', ({ cardId }: { cardId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.filter((c) => c.id !== cardId),
          comments: prev.comments.filter((c) => c.cardId !== cardId),
          updatedAt: Date.now(),
        };
      });
      if (commentCardId === cardId) {
        setCommentCardId(null);
      }
    });

    socket.on('card_locked', ({ cardId, user }: { cardId: string; user: User }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) => (c.id === cardId ? { ...c, lockedBy: user } : c)),
        };
      });
    });

    socket.on('card_unlocked', ({ cardId }: { cardId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) => (c.id === cardId ? { ...c, lockedBy: null } : c)),
        };
      });
    });

    socket.on('comment_added', ({ comment }: { comment: Comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, comments: [...prev.comments, comment], updatedAt: Date.now() };
      });
    });

    socket.on('user_joined', ({ activeUsers: users }: { activeUsers: string[] }) => {
      setActiveUsers(users);
    });

    socket.on('user_left', ({ activeUsers: users }: { activeUsers: string[] }) => {
      setActiveUsers(users);
    });

    return () => {
      socket.off('board_state');
      socket.off('card_added');
      socket.off('card_updated');
      socket.off('card_deleted');
      socket.off('card_locked');
      socket.off('card_unlocked');
      socket.off('comment_added');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, [socket, boardId, currentUser, commentCardId]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Position => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.x) / viewport.scale,
        y: (screenY - rect.top - viewport.y) / viewport.scale,
      };
    },
    [viewport]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setViewport((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));
      if (!containerRef.current) return prev;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
      };
    });
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current && e.target !== containerRef.current) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vpX: viewport.x,
      vpY: viewport.y,
    };
    setShowAddMenu(false);
  }, [viewport]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      setViewport((prev) => ({
        ...prev,
        x: panStartRef.current!.vpX + (e.clientX - panStartRef.current!.x),
        y: panStartRef.current!.vpY + (e.clientY - panStartRef.current!.y),
      }));
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  const computeAlignGuides = useCallback(
    (movingCardId: string, pos: Position): AlignGuides => {
      if (!board) return { x: null, y: null };
      const movingCard = board.cards.find((c) => c.id === movingCardId);
      if (!movingCard) return { x: null, y: null };

      let guideX: number | null = null;
      let guideY: number | null = null;
      const movingCenterX = pos.x + movingCard.size.width / 2;
      const movingCenterY = pos.y + movingCard.size.height / 2;

      for (const card of board.cards) {
        if (card.id === movingCardId) continue;
        const cardCenterX = card.position.x + card.size.width / 2;
        const cardCenterY = card.position.y + card.size.height / 2;

        if (Math.abs(pos.x - card.position.x) < SNAP_THRESHOLD) guideX = card.position.x;
        if (Math.abs(pos.y - card.position.y) < SNAP_THRESHOLD) guideY = card.position.y;
        if (Math.abs(movingCenterX - cardCenterX) < SNAP_THRESHOLD) guideX = cardCenterX - movingCard.size.width / 2;
        if (Math.abs(movingCenterY - cardCenterY) < SNAP_THRESHOLD) guideY = cardCenterY - movingCard.size.height / 2;
        if (Math.abs(pos.x + movingCard.size.width - (card.position.x + card.size.width)) < SNAP_THRESHOLD) {
          guideX = card.position.x + card.size.width - movingCard.size.width;
        }
        if (Math.abs(pos.y + movingCard.size.height - (card.position.y + card.size.height)) < SNAP_THRESHOLD) {
          guideY = card.position.y + card.size.height - movingCard.size.height;
        }
      }

      if (Math.abs(pos.x) < SNAP_THRESHOLD) guideX = 0;
      if (Math.abs(pos.y) < SNAP_THRESHOLD) guideY = 0;

      return { x: guideX, y: guideY };
    },
    [board]
  );

  const flushPendingUpdates = useCallback(() => {
    if (!socket) return;
    pendingUpdatesRef.current.forEach((pos, cardId) => {
      socket.emit('update_card', {
        cardId,
        updates: { position: pos },
      });
    });
    pendingUpdatesRef.current.clear();
    updateFrameRef.current = null;
  }, [socket]);

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent, card: CardType) => {
      e.stopPropagation();
      if (card.lockedBy && card.lockedBy.id !== currentUser.id) return;

      socket.emit('lock_card', { cardId: card.id });
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDragState({
        cardId: card.id,
        startX: worldPos.x,
        startY: worldPos.y,
        startPosX: card.position.x,
        startPosY: card.position.y,
      });
      setDraggingCardId(card.id);
    },
    [currentUser.id, screenToWorld, socket]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const dx = worldPos.x - dragState.startX;
      const dy = worldPos.y - dragState.startY;
      let newX = dragState.startPosX + dx;
      let newY = dragState.startPosY + dy;

      const guides = computeAlignGuides(dragState.cardId, { x: newX, y: newY });
      setAlignGuides(guides);
      if (guides.x !== null) newX = guides.x;
      if (guides.y !== null) newY = guides.y;

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === dragState.cardId
              ? { ...c, position: { x: newX, y: newY }, updatedAt: Date.now() }
              : c
          ),
        };
      });

      pendingUpdatesRef.current.set(dragState.cardId, { x: newX, y: newY });
      if (!updateFrameRef.current) {
        updateFrameRef.current = window.setTimeout(flushPendingUpdates, 50);
      }
    };

    const handleMouseUp = () => {
      flushPendingUpdates();
      socket.emit('unlock_card', { cardId: dragState.cardId });
      setDragState(null);
      setDraggingCardId(null);
      setAlignGuides({ x: null, y: null });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, screenToWorld, socket, computeAlignGuides, flushPendingUpdates]);

  const addCard = useCallback(
    (type: CardTypeEnum) => {
      const centerX = -viewport.x / viewport.scale + (containerRef.current?.clientWidth || 800) / (2 * viewport.scale) - 150;
      const centerY = -viewport.y / viewport.scale + (containerRef.current?.clientHeight || 600) / (2 * viewport.scale) - 100;
      const data: CardData = {};
      if (type === 'text') data.text = { title: '', content: '' };
      if (type === 'image') data.image = { url: '' };
      if (type === 'link') data.link = { url: '', title: '', description: '', thumbnail: '' };
      socket.emit('add_card', { type, position: { x: centerX, y: centerY }, data });
      setShowAddMenu(false);
    },
    [socket, viewport]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      if (confirm('确定要删除这张卡片吗？')) {
        socket.emit('delete_card', { cardId });
        setEditingCard(null);
      }
    },
    [socket]
  );

  const openEditor = useCallback((card: CardType) => {
    setEditingCard(card);
  }, []);

  const saveEdit = useCallback(
    (cardId: string, data: CardData) => {
      socket.emit('update_card', { cardId, updates: { data } });
      setEditingCard(null);
    },
    [socket]
  );

  const addComment = useCallback(
    (content: string) => {
      if (!commentCardId) return;
      socket.emit('add_comment', { cardId: commentCardId, content });
    },
    [socket, commentCardId]
  );

  const getCommentCount = (cardId: string) => {
    return board?.comments.filter((c) => c.cardId === cardId).length || 0;
  };

  const getCardTitle = (cardId: string) => {
    const card = board?.cards.find((c) => c.id === cardId);
    if (!card) return '';
    if (card.type === 'text') return card.data.text?.title || '文字卡片';
    if (card.type === 'link') return card.data.link?.title || '链接卡片';
    return '图片卡片';
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareModal(false);
    alert('分享链接已复制！');
  };

  const resetView = () => {
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  if (!board) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: '#7f8c8d' }}>正在加载展板...</p>
      </div>
    );
  }

  const gridSize = 40 / viewport.scale;
  const bgColor = board.backgroundColor || '#F5F7FA';

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        cursor: isPanning ? 'grabbing' : 'grab',
        background: bgColor,
      }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
    >
      <div style={styles.toolbar}>
        <button style={styles.toolBtn} onClick={() => window.history.back()} title="返回">
          ← 返回
        </button>
        <div style={styles.boardInfo}>
          <h2 style={styles.boardTitle}>{board.title}</h2>
          {board.description && <span style={styles.boardDesc}>{board.description}</span>}
        </div>
        <div style={styles.toolbarRight}>
          <div style={styles.userAvatars}>
            {activeUsers.slice(0, 4).map((uid, i) => (
              <div
                key={uid}
                style={{
                  ...styles.onlineAvatar,
                  marginLeft: i > 0 ? '-8px' : 0,
                  zIndex: 10 - i,
                }}
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${uid.charAt(0).toUpperCase()}&background=4A90D9&color=fff&size=32`}
                  alt=""
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </div>
            ))}
            {activeUsers.length > 4 && (
              <div style={{ ...styles.onlineAvatar, marginLeft: '-8px', background: '#e0e4e8', fontSize: '11px', color: '#5a6878' }}>
                +{activeUsers.length - 4}
              </div>
            )}
          </div>
          <div style={styles.zoomControl}>
            <button style={styles.zoomBtn} onClick={() => setViewport((p) => ({ ...p, scale: Math.max(MIN_SCALE, p.scale - SCALE_STEP) }))}>−</button>
            <span style={styles.zoomLabel}>{Math.round(viewport.scale * 100)}%</span>
            <button style={styles.zoomBtn} onClick={() => setViewport((p) => ({ ...p, scale: Math.min(MAX_SCALE, p.scale + SCALE_STEP) }))}>+</button>
            <button style={styles.zoomBtn} onClick={resetView}>⟲</button>
          </div>
          <button style={styles.toolBtn} onClick={() => setShowShareModal(true)}>
            🔗 分享
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: viewport.x,
            top: viewport.y,
            width: '100vw',
            height: '100vh',
            backgroundImage: `
              linear-gradient(to right, rgba(160, 170, 180, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(160, 170, 180, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: viewport.x,
            top: viewport.y,
            transformOrigin: '0 0',
            transform: `scale(${viewport.scale})`,
          }}
        >
          {board.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              scale={viewport.scale}
              isDragging={draggingCardId === card.id}
              isEditing={editingCard?.id === card.id}
              currentUser={currentUser}
              onMouseDown={(e) => handleCardMouseDown(e, card)}
              onDoubleClick={() => openEditor(card)}
              onDelete={() => deleteCard(card.id)}
              onShowComments={() => setCommentCardId(card.id)}
              commentCount={getCommentCount(card.id)}
            />
          ))}

          {alignGuides.x !== null && (
            <div
              style={{
                position: 'absolute',
                left: alignGuides.x,
                top: -10000,
                width: 1,
                height: 20000,
                background: '#4A90D9',
                pointerEvents: 'none',
                zIndex: 999,
              }}
            />
          )}
          {alignGuides.y !== null && (
            <div
              style={{
                position: 'absolute',
                left: -10000,
                top: alignGuides.y,
                width: 20000,
                height: 1,
                background: '#4A90D9',
                pointerEvents: 'none',
                zIndex: 999,
              }}
            />
          )}
        </div>
      </div>

      <div style={styles.addMenuWrapper}>
        <button style={styles.addBtn} onClick={() => setShowAddMenu(!showAddMenu)}>
          {showAddMenu ? '✕' : '+'}
        </button>
        {showAddMenu && (
          <div style={styles.addMenu}>
            <button style={styles.addMenuItem} onClick={() => addCard('text')}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <div style={{ textAlign: 'left' }}>
                <div style={styles.addMenuTitle}>文字卡片</div>
                <div style={styles.addMenuDesc}>添加标题和正文</div>
              </div>
            </button>
            <button style={styles.addMenuItem} onClick={() => addCard('image')}>
              <span style={{ fontSize: '20px' }}>🖼️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={styles.addMenuTitle}>图片卡片</div>
                <div style={styles.addMenuDesc}>添加图片URL或本地上传</div>
              </div>
            </button>
            <button style={styles.addMenuItem} onClick={() => addCard('link')}>
              <span style={{ fontSize: '20px' }}>🔗</span>
              <div style={{ textAlign: 'left' }}>
                <div style={styles.addMenuTitle}>链接卡片</div>
                <div style={styles.addMenuDesc}>粘贴网址自动生成预览</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {editingCard && (
        <div style={styles.modalOverlay} onClick={() => setEditingCard(null)}>
          <div style={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.editTitle}>编辑卡片</h3>
            {editingCard.type === 'text' && (
              <TextEditor card={editingCard} onSave={saveEdit} onCancel={() => setEditingCard(null)} />
            )}
            {editingCard.type === 'image' && (
              <ImageEditor card={editingCard} onSave={saveEdit} onCancel={() => setEditingCard(null)} />
            )}
            {editingCard.type === 'link' && (
              <LinkEditor card={editingCard} onSave={saveEdit} onCancel={() => setEditingCard(null)} />
            )}
          </div>
        </div>
      )}

      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.editTitle}>分享展板</h3>
            <p style={{ fontSize: '14px', color: '#5a6878', marginBottom: '16px' }}>
              将链接分享给其他人，他们就能加入协作编辑
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={typeof window !== 'undefined' ? window.location.href : ''}
                readOnly
              />
              <button style={styles.primaryBtn} onClick={copyShareLink}>
                复制链接
              </button>
            </div>
            <div style={{ marginTop: '20px', fontSize: '13px', color: '#95a5a6' }}>
              当前在线协作者：{activeUsers.length} 人
            </div>
            <button
              style={{ ...styles.cancelBtn, marginTop: '20px', width: '100%' }}
              onClick={() => setShowShareModal(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <CommentPanel
        isOpen={!!commentCardId}
        onClose={() => setCommentCardId(null)}
        comments={board.comments.filter((c) => c.cardId === commentCardId)}
        onAddComment={addComment}
        currentUser={currentUser}
        cardTitle={commentCardId ? getCardTitle(commentCardId) : ''}
      />

      {isMobile && (
        <div style={styles.mobileHint}>
          💡 双指缩放 / 单指拖动移动画布
        </div>
      )}
    </div>
  );
};

interface EditorProps {
  card: CardType;
  onSave: (cardId: string, data: CardData) => void;
  onCancel: () => void;
}

const TextEditor: React.FC<EditorProps> = ({ card, onSave, onCancel }) => {
  const [title, setTitle] = useState(card.data.text?.title || '');
  const [content, setContent] = useState(card.data.text?.content || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={styles.label}>标题</label>
        <input
          style={styles.input}
          placeholder="输入标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label style={styles.label}>正文</label>
        <textarea
          style={{ ...styles.input, minHeight: '120px' }}
          placeholder="输入正文内容..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button style={styles.cancelBtn} onClick={onCancel}>取消</button>
        <button style={styles.primaryBtn} onClick={() => onSave(card.id, { text: { title, content } })}>
          保存
        </button>
      </div>
    </div>
  );
};

const ImageEditor: React.FC<EditorProps> = ({ card, onSave, onCancel }) => {
  const [url, setUrl] = useState(card.data.image?.url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUrl((ev.target?.result as string) || '');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={styles.label}>图片URL</label>
        <input
          style={styles.input}
          placeholder="https://example.com/image.jpg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div style={{ textAlign: 'center', padding: '8px', color: '#7f8c8d', fontSize: '13px' }}>
        或者
      </div>
      <div>
        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        <button style={{ ...styles.secondaryBtn, width: '100%' }} onClick={() => fileInputRef.current?.click()}>
          📤 本地上传图片
        </button>
      </div>
      {url && (
        <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#f0f2f5', maxHeight: '200px' }}>
          <img src={url} alt="预览" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '200px' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button style={styles.cancelBtn} onClick={onCancel}>取消</button>
        <button style={styles.primaryBtn} onClick={() => onSave(card.id, { image: { url } })}>
          保存
        </button>
      </div>
    </div>
  );
};

const LinkEditor: React.FC<EditorProps> = ({ card, onSave, onCancel }) => {
  const [url, setUrl] = useState(card.data.link?.url || '');
  const [title, setTitle] = useState(card.data.link?.title || '');
  const [description, setDescription] = useState(card.data.link?.description || '');
  const [thumbnail, setThumbnail] = useState(card.data.link?.thumbnail || '');

  const autoFill = () => {
    if (!url) return;
    try {
      const hostname = new URL(url).hostname;
      if (!title) setTitle(hostname);
      if (!thumbnail) setThumbnail(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`);
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={styles.label}>链接URL</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button style={styles.secondaryBtn} onClick={autoFill}>自动获取</button>
        </div>
      </div>
      <div>
        <label style={styles.label}>网站标题</label>
        <input style={styles.input} placeholder="网站标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label style={styles.label}>描述</label>
        <textarea
          style={{ ...styles.input, minHeight: '60px' }}
          placeholder="网站描述..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div>
        <label style={styles.label}>预览图URL</label>
        <input style={styles.input} placeholder="缩略图地址" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button style={styles.cancelBtn} onClick={onCancel}>取消</button>
        <button style={styles.primaryBtn} onClick={() => onSave(card.id, { link: { url, title, description, thumbnail } })}>
          保存
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
  },
  loading: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f7fa',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #e0e4e8',
    borderTopColor: '#4A90D9',
    animation: 'spin 0.8s linear infinite',
  },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    zIndex: 100,
  },
  toolBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    background: '#f0f4f8',
    color: '#34495e',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  boardInfo: {
    flex: 1,
    minWidth: 0,
  },
  boardTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#2c3e50',
    margin: 0,
  },
  boardDesc: {
    fontSize: '12px',
    color: '#7f8c8d',
    marginLeft: '4px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatars: {
    display: 'flex',
    alignItems: 'center',
  },
  onlineAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '2px solid #fff',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#4A90D9',
    color: '#fff',
    fontWeight: 600,
    fontSize: '12px',
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    background: '#f0f4f8',
    borderRadius: '8px',
    padding: '2px',
    gap: '2px',
  },
  zoomBtn: {
    width: '32px',
    height: '28px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: '#34495e',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  zoomLabel: {
    fontSize: '12px',
    color: '#5a6878',
    minWidth: '44px',
    textAlign: 'center',
    fontWeight: 500,
  },
  addMenuWrapper: {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  },
  addBtn: {
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    border: 'none',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
    color: '#fff',
    fontSize: '28px',
    fontWeight: 300,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(74, 144, 217, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMenu: {
    position: 'absolute',
    bottom: '72px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    borderRadius: '16px',
    padding: '8px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    minWidth: '260px',
  },
  addMenuItem: {
    width: '100%',
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
  },
  addMenuTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2c3e50',
  },
  addMenuDesc: {
    fontSize: '12px',
    color: '#7f8c8d',
    marginTop: '2px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  editModal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '28px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  shareModal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '28px',
    width: '100%',
    maxWidth: '440px',
  },
  editTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#34495e',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e0e4e8',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '10px 22px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)',
  },
  secondaryBtn: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: '8px',
    background: '#f0f4f8',
    color: '#34495e',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 22px',
    border: 'none',
    borderRadius: '8px',
    background: '#f0f4f8',
    color: '#34495e',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  mobileHint: {
    position: 'absolute',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '12px',
    zIndex: 100,
  },
};

export default Board;
