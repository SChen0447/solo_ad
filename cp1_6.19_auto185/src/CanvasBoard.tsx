import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Card, Connection, EditorState, BoardState, CardType, CardData, TextCardData, ImageCardData, LinkCardData } from './types';
import { CardManager } from './CardManager';
import { ConnectionManager } from './ConnectionManager';

interface CanvasBoardProps {
  cardManager: CardManager;
  connectionManager: ConnectionManager;
  onRequestAdd: () => void;
  addTrigger: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const GRID_SIZE = 40;

const initialBoardState: BoardState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  isPanning: false,
  selectedCardId: null,
  selectedConnectionId: null,
  draggingCardId: null,
  resizingCardId: null,
  connecting: {
    active: false,
    fromCardId: null,
    startPoint: null,
    currentPoint: null
  }
};

const initialEditorState: EditorState = {
  visible: false,
  x: 0,
  y: 0,
  cardType: 'text',
  textContent: '',
  imageUrl: '',
  linkUrl: '',
  linkTitle: '',
  linkFavicon: '',
  isLoading: false,
  uploading: false
};

const enteringCards = new Set<string>();

export const CanvasBoard: React.FC<CanvasBoardProps> = ({ cardManager, connectionManager, addTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const [boardState, setBoardState] = useState<BoardState>(initialBoardState);
  const boardStateRef = useRef(boardState);
  boardStateRef.current = boardState;

  const [editorState, setEditorState] = useState<EditorState>(initialEditorState);
  const editorStateRef = useRef(editorState);
  editorStateRef.current = editorState;

  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; cardX: number; cardY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const unsubCards = cardManager.subscribe(forceUpdate);
    const unsubConns = connectionManager.subscribe(forceUpdate);
    return () => {
      unsubCards();
      unsubConns();
    };
  }, [cardManager, connectionManager, forceUpdate]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const b = boardStateRef.current;
    return {
      x: (sx - b.offsetX) / b.scale,
      y: (sy - b.offsetY) / b.scale
    };
  }, []);

  useEffect(() => {
    if (addTrigger === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = rect.left + rect.width / 2;
    const sy = rect.top + rect.height / 2;
    const world = screenToWorld(sx, sy);
    openEditor(world.x - 120, world.y - 80, 'text');
  }, [addTrigger, screenToWorld]);

  const openEditor = (x: number, y: number, cardType: CardType) => {
    setEditorState({
      visible: true,
      x,
      y,
      cardType,
      textContent: '',
      imageUrl: '',
      linkUrl: '',
      linkTitle: '',
      linkFavicon: '',
      isLoading: false,
      uploading: false
    });
  };

  const closeEditor = () => {
    setEditorState(s => ({ ...s, visible: false }));
  };

  const setEditorType = (type: CardType) => {
    setEditorState(s => ({ ...s, cardType: type }));
  };

  const onContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.card') || target.closest('.connections-svg')) return;
    if (editorStateRef.current.visible) return;

    setBoardState(s => ({
      ...s,
      isPanning: true,
      selectedCardId: null,
      selectedConnectionId: null
    }));
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: boardStateRef.current.offsetX,
      offsetY: boardStateRef.current.offsetY
    };
  };

  const onContainerMouseMove = (e: React.MouseEvent) => {
    const bs = boardStateRef.current;

    if (bs.isPanning && panStartRef.current) {
      const ps = panStartRef.current;
      setBoardState(s => ({
        ...s,
        offsetX: ps.offsetX + (e.clientX - ps.x),
        offsetY: ps.offsetY + (e.clientY - ps.y)
      }));
      return;
    }

    if (bs.draggingCardId && dragStartRef.current) {
      const ds = dragStartRef.current;
      const world = screenToWorld(e.clientX, e.clientY);
      const card = cardManager.getCard(bs.draggingCardId);
      if (card) {
        cardManager.updateCard(bs.draggingCardId, {
          x: ds.cardX + (world.x - ds.x),
          y: ds.cardY + (world.y - ds.y)
        });
      }
      return;
    }

    if (bs.resizingCardId && resizeStartRef.current) {
      const rs = resizeStartRef.current;
      const world = screenToWorld(e.clientX, e.clientY);
      const card = cardManager.getCard(bs.resizingCardId);
      if (card) {
        const dw = (world.x - rs.x) / bs.scale * bs.scale;
        const dh = (world.y - rs.y) / bs.scale * bs.scale;
        cardManager.resizeCard(bs.resizingCardId, rs.width + dw, rs.height + dh);
      }
      return;
    }

    if (bs.connecting.active && bs.connecting.startPoint) {
      const world = screenToWorld(e.clientX, e.clientY);
      setBoardState(s => ({
        ...s,
        connecting: { ...s.connecting, currentPoint: world }
      }));
    }
  };

  const onContainerMouseUp = (e: React.MouseEvent) => {
    const bs = boardStateRef.current;

    if (bs.isPanning) {
      setBoardState(s => ({ ...s, isPanning: false }));
      panStartRef.current = null;
      return;
    }

    if (bs.draggingCardId) {
      setBoardState(s => ({ ...s, draggingCardId: null }));
      dragStartRef.current = null;
      return;
    }

    if (bs.resizingCardId) {
      setBoardState(s => ({ ...s, resizingCardId: null }));
      resizeStartRef.current = null;
      return;
    }

    if (bs.connecting.active && bs.connecting.fromCardId && bs.connecting.currentPoint) {
      const world = screenToWorld(e.clientX, e.clientY);
      const cards = cardManager.getCards();
      let targetCard: Card | null = null;
      for (const card of cards) {
        if (card.id === bs.connecting.fromCardId) continue;
        if (world.x >= card.x && world.x <= card.x + card.width &&
            world.y >= card.y && world.y <= card.y + card.height) {
          targetCard = card;
          break;
        }
      }
      if (targetCard) {
        connectionManager.createConnection(bs.connecting.fromCardId, targetCard.id);
      }
      setBoardState(s => ({
        ...s,
        connecting: { active: false, fromCardId: null, startPoint: null, currentPoint: null }
      }));
    }
  };

  const onContainerWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const prevScale = boardStateRef.current.scale;
    let newScale = prevScale * (1 + delta);
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    const ratio = newScale / prevScale;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setBoardState(s => ({
      ...s,
      scale: newScale,
      offsetX: mx - (mx - s.offsetX) * ratio,
      offsetY: my - (my - s.offsetY) * ratio
    }));
  };

  const onContainerDoubleClick = (e: React.MouseEvent) => {
    if (editorStateRef.current.visible) return;
    const target = e.target as HTMLElement;
    if (target.closest('.card') || target.closest('.connections-svg')) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    openEditor(world.x - 120, world.y - 80, 'text');
  };

  const onCardMouseDown = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.classList.contains('card-resize')) return;
    if (target.classList.contains('card-connect')) return;
    if (target.classList.contains('card-header') || target.closest('.card')) {
      setBoardState(s => ({
        ...s,
        selectedCardId: card.id,
        selectedConnectionId: null,
        draggingCardId: card.id
      }));
      const world = screenToWorld(e.clientX, e.clientY);
      dragStartRef.current = {
        x: world.x,
        y: world.y,
        cardX: card.x,
        cardY: card.y
      };
    }
  };

  const onResizeMouseDown = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    const world = screenToWorld(e.clientX, e.clientY);
    setBoardState(s => ({
      ...s,
      resizingCardId: card.id,
      selectedCardId: card.id,
      selectedConnectionId: null
    }));
    resizeStartRef.current = {
      x: world.x,
      y: world.y,
      width: card.width,
      height: card.height
    };
  };

  const onConnectMouseDown = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    const start = ConnectionManager.getCardBottomCenter(card);
    setBoardState(s => ({
      ...s,
      connecting: {
        active: true,
        fromCardId: card.id,
        startPoint: start,
        currentPoint: start
      }
    }));
  };

  const onConnectionClick = (e: React.MouseEvent, conn: Connection) => {
    e.stopPropagation();
    setBoardState(s => ({
      ...s,
      selectedConnectionId: conn.id,
      selectedCardId: null
    }));
  };

  const handleEditorTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorState(s => ({ ...s, textContent: e.target.value }));
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
  };

  const handleEditorLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setEditorState(s => ({ ...s, linkUrl: url, isLoading: false, linkTitle: '', linkFavicon: '' }));
    if (!url) return;
    try {
      const parsed = new URL(url);
      const favicon = `${parsed.protocol}//${parsed.hostname}/favicon.ico`;
      setEditorState(s => ({ ...s, linkFavicon: favicon, isLoading: true }));
      const tryTitle = parsed.hostname.replace(/^www\./, '');
      setEditorState(s => ({ ...s, linkTitle: tryTitle, isLoading: false }));
    } catch {
      // invalid url
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditorState(s => ({ ...s, uploading: true }));
    const reader = new FileReader();
    reader.onload = () => {
      setEditorState(s => ({ ...s, imageUrl: reader.result as string, uploading: false }));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditorConfirm = () => {
    const es = editorStateRef.current;
    let data: CardData | null = null;
    let w = 240;
    let h = 160;

    if (es.cardType === 'text') {
      if (!es.textContent.trim()) return;
      data = { content: es.textContent.trim() } as TextCardData;
      h = Math.max(100, Math.min(320, 80 + es.textContent.length * 0.6));
    } else if (es.cardType === 'image') {
      if (!es.imageUrl) return;
      data = { url: es.imageUrl } as ImageCardData;
      w = 280;
      h = 220;
    } else if (es.cardType === 'link') {
      if (!es.linkUrl.trim()) return;
      data = {
        url: es.linkUrl.trim(),
        title: es.linkTitle || es.linkUrl,
        favicon: es.linkFavicon
      } as LinkCardData;
      w = 260;
      h = 100;
    }

    if (!data) return;
    const card = cardManager.createCard(es.cardType, es.x, es.y, data, w, h);
    enteringCards.add(card.id);
    setEnteringIds(new Set(enteringCards));
    setTimeout(() => {
      enteringCards.delete(card.id);
      setEnteringIds(new Set(enteringCards));
    }, 300);

    closeEditor();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editorStateRef.current.visible) {
        if (e.key === 'Escape') closeEditor();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditorConfirm();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const bs = boardStateRef.current;
        if (bs.selectedCardId) {
          cardManager.deleteCard(bs.selectedCardId);
          connectionManager.deleteConnectionsByCard(bs.selectedCardId);
          setBoardState(s => ({ ...s, selectedCardId: null }));
        } else if (bs.selectedConnectionId) {
          connectionManager.deleteConnection(bs.selectedConnectionId);
          setBoardState(s => ({ ...s, selectedConnectionId: null }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        cardManager.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        cardManager.redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cardManager, connectionManager]);

  const cards = cardManager.getCards();
  const connections = connectionManager.getConnections();

  const gridStyle = useMemo(() => {
    const size = GRID_SIZE * boardState.scale;
    return {
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${boardState.offsetX}px ${boardState.offsetY}px`
    };
  }, [boardState.scale, boardState.offsetX, boardState.offsetY]);

  const contentTransform = `translate(${boardState.offsetX}px, ${boardState.offsetY}px) scale(${boardState.scale})`;

  const renderCardContent = (card: Card) => {
    if (card.type === 'text') {
      const d = card.data as TextCardData;
      return (
        <div className="card-content" style={{ fontSize: 14 * boardState.scale / boardState.scale }}>
          {d.content}
        </div>
      );
    }
    if (card.type === 'image') {
      const d = card.data as ImageCardData;
      return <img className="card-image" src={d.url} alt="" draggable={false} />;
    }
    if (card.type === 'link') {
      const d = card.data as LinkCardData;
      return (
        <div className="card-link" onClick={(e) => { e.stopPropagation(); if (d.url) window.open(d.url, '_blank'); }} style={{ cursor: 'pointer' }}>
          <div className="card-link-header">
            {d.favicon && <img className="card-link-favicon" src={d.favicon} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            <span className="card-link-title">{d.title || d.url}</span>
          </div>
          <span className="card-link-url">{d.url}</span>
        </div>
      );
    }
    return null;
  };

  const renderConnections = () => {
    const elements: React.ReactNode[] = [];
    const cardsMap = new Map(cards.map(c => [c.id, c]));

    connections.forEach(conn => {
      const fromCard = cardsMap.get(conn.fromCardId);
      const toCard = cardsMap.get(conn.toCardId);
      if (!fromCard || !toCard) return;
      const from = ConnectionManager.getCardBottomCenter(fromCard);
      const to = ConnectionManager.getCardTopCenter(toCard);
      const path = ConnectionManager.getBezierPath(from, to);
      const isSelected = boardState.selectedConnectionId === conn.id;

      elements.push(
        <path
          key={conn.id}
          d={path}
          className={`connection-line ${isSelected ? 'selected' : ''}`}
          onClick={(e) => onConnectionClick(e, conn)}
        />
      );
      elements.push(
        <circle key={`${conn.id}-dot1`} cx={from.x} cy={from.y} r={4} className={`connection-dot ${isSelected ? 'selected' : ''}`} />
      );
      elements.push(
        <circle key={`${conn.id}-dot2`} cx={to.x} cy={to.y} r={4} className={`connection-dot ${isSelected ? 'selected' : ''}`} />
      );
    });

    if (boardState.connecting.active && boardState.connecting.startPoint && boardState.connecting.currentPoint) {
      const tempPath = ConnectionManager.getBezierPath(
        boardState.connecting.startPoint,
        boardState.connecting.currentPoint
      );
      elements.push(<path key="temp" d={tempPath} className="connection-temp" />);
    }

    return elements;
  };

  return (
    <div
      ref={containerRef}
      className={`board-container ${boardState.isPanning ? 'panning' : (!editorState.visible ? 'grab' : '')}`}
      onMouseDown={onContainerMouseDown}
      onMouseMove={onContainerMouseMove}
      onMouseUp={onContainerMouseUp}
      onMouseLeave={onContainerMouseUp}
      onWheel={onContainerWheel}
      onDoubleClick={onContainerDoubleClick}
    >
      <div className="board-grid" style={gridStyle} />

      <div className="board-content" style={{ transform: contentTransform }}>
        <svg className="connections-svg" width="10000" height="10000">
          {renderConnections()}
        </svg>

        {cards.map(card => {
          const isSelected = boardState.selectedCardId === card.id;
          const isEntering = enteringIds.has(card.id);
          return (
            <div
              key={card.id}
              className={`card ${isSelected ? 'selected' : ''} ${isEntering ? 'card-enter' : ''}`}
              style={{
                left: card.x,
                top: card.y,
                width: card.width,
                height: card.height
              }}
              onMouseDown={(e) => onCardMouseDown(e, card)}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <div className="card-header" />
              {renderCardContent(card)}
              <div
                className="card-connect"
                onMouseDown={(e) => onConnectMouseDown(e, card)}
                title="拖拽连接到其他卡片"
              />
              <div
                className="card-resize"
                onMouseDown={(e) => onResizeMouseDown(e, card)}
              />
            </div>
          );
        })}
      </div>

      {editorState.visible && (
        <div className="card-editor-overlay" onClick={closeEditor}>
          <div className="card-editor" onClick={(e) => e.stopPropagation()}>
            <div className="card-editor-header">
              <div
                className={`card-editor-tab ${editorState.cardType === 'text' ? 'active' : ''}`}
                onClick={() => setEditorType('text')}
              >
                文字
              </div>
              <div
                className={`card-editor-tab ${editorState.cardType === 'image' ? 'active' : ''}`}
                onClick={() => setEditorType('image')}
              >
                图片
              </div>
              <div
                className={`card-editor-tab ${editorState.cardType === 'link' ? 'active' : ''}`}
                onClick={() => setEditorType('link')}
              >
                链接
              </div>
            </div>

            <div className="card-editor-body">
              {editorState.cardType === 'text' && (
                <textarea
                  className="card-editor-textarea"
                  placeholder="输入灵感文字..."
                  value={editorState.textContent}
                  onChange={handleEditorTextChange}
                  autoFocus
                />
              )}
              {editorState.cardType === 'image' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  {editorState.uploading ? (
                    <div className="card-editor-loading">
                      <div className="card-editor-spinner" />
                    </div>
                  ) : editorState.imageUrl ? (
                    <div className="card-editor-upload has-image" onClick={handleUploadClick}>
                      <img src={editorState.imageUrl} alt="" />
                    </div>
                  ) : (
                    <div className="card-editor-upload" onClick={handleUploadClick}>
                      点击上传图片
                    </div>
                  )}
                </>
              )}
              {editorState.cardType === 'link' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    className="card-editor-input"
                    placeholder="输入网址，例如 https://example.com"
                    value={editorState.linkUrl}
                    onChange={handleEditorLinkChange}
                    autoFocus
                  />
                  {editorState.linkTitle && (
                    <div className="card-editor-link-preview">
                      {editorState.linkFavicon && (
                        <img className="card-link-favicon" src={editorState.linkFavicon} alt=""
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <span className="card-link-title" style={{ flex: 1 }}>{editorState.linkTitle}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card-editor-footer">
              <button className="card-editor-btn card-editor-btn-cancel" onClick={closeEditor}>
                取消
              </button>
              <button
                className="card-editor-btn card-editor-btn-confirm"
                onClick={handleEditorConfirm}
                disabled={
                  (editorState.cardType === 'text' && !editorState.textContent.trim()) ||
                  (editorState.cardType === 'image' && !editorState.imageUrl) ||
                  (editorState.cardType === 'link' && !editorState.linkUrl.trim())
                }
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
