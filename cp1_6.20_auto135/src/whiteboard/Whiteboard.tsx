import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { IdeaCardData, Session } from '../types';
import { CARD_WIDTH, CARD_HEIGHT, Phase } from '../types';
import { IdeaCard } from './IdeaCard';
import { generateCardId, pointInRect } from './utils';

interface WhiteboardProps {
  session: Session;
  currentUserId: string;
  phase: Phase;
  onCardCreated?: (card: IdeaCardData) => void;
  onCardUpdated?: (cardId: string, updates: { content?: string; color?: string | null }) => void;
  onCardMoved?: (cardId: string, x: number, y: number, zIndex: number) => void;
  onCardDeleted?: (cardId: string) => void;
  onStatusChange?: (status: 'editing' | 'browsing') => void;
}

interface DragState {
  cardId: string;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  session,
  currentUserId,
  phase,
  onCardCreated,
  onCardUpdated,
  onCardMoved,
  onCardDeleted,
  onStatusChange,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [localPositions, setLocalPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const zIndexCounter = useRef(session.cards.length + 10);
  const statusTimeoutRef = useRef<number | null>(null);

  const cardsMap = useMemo(() => {
    const m = new Map<string, IdeaCardData>();
    session.cards.forEach((c) => m.set(c.id, c));
    return m;
  }, [session.cards]);

  const setEditingStatus = useCallback(() => {
    onStatusChange?.('editing');
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = window.setTimeout(() => {
      onStatusChange?.('browsing');
    }, 3000);
  }, [onStatusChange]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (phase !== 'brainstorm') return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-card-id]')) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const x = e.clientX - rect.left - CARD_WIDTH / 2 + board.scrollLeft;
      const y = e.clientY - rect.top - CARD_HEIGHT / 2 + board.scrollTop;

      const author = session.users.find((u) => u.id === currentUserId);
      const newCard: IdeaCardData = {
        id: generateCardId(),
        sessionId: session.id,
        content: '',
        authorId: currentUserId,
        authorName: author?.nickname || '匿名',
        color: null,
        x: Math.max(8, x),
        y: Math.max(8, y),
        zIndex: ++zIndexCounter.current,
        votes: [],
        createdAt: Date.now(),
      };
      onCardCreated?.(newCard);
      setEditingStatus();
    },
    [phase, session.id, session.users, currentUserId, onCardCreated, setEditingStatus],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      if (phase !== 'brainstorm') return;
      const card = cardsMap.get(cardId);
      if (!card) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const baseX = (localPositions.get(cardId)?.x ?? card.x);
      const baseY = (localPositions.get(cardId)?.y ?? card.y);
      const offsetX = e.clientX - rect.left - baseX + board.scrollLeft;
      const offsetY = e.clientY - rect.top - baseY + board.scrollTop;

      setDragState({ cardId, offsetX, offsetY, moved: false });
      setDraggingCardId(cardId);
      zIndexCounter.current++;
      onCardMoved?.(cardId, baseX, baseY, zIndexCounter.current);
      setEditingStatus();
    },
    [phase, cardsMap, localPositions, onCardMoved, setEditingStatus],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, cardId: string) => {
      if (phase !== 'brainstorm') return;
      const card = cardsMap.get(cardId);
      if (!card) return;
      const touch = e.touches[0];
      const board = boardRef.current;
      if (!board || !touch) return;
      const rect = board.getBoundingClientRect();
      const baseX = localPositions.get(cardId)?.x ?? card.x;
      const baseY = localPositions.get(cardId)?.y ?? card.y;
      const offsetX = touch.clientX - rect.left - baseX + board.scrollLeft;
      const offsetY = touch.clientY - rect.top - baseY + board.scrollTop;

      setDragState({ cardId, offsetX, offsetY, moved: false });
      setDraggingCardId(cardId);
      zIndexCounter.current++;
      onCardMoved?.(cardId, baseX, baseY, zIndexCounter.current);
      setEditingStatus();
    },
    [phase, cardsMap, localPositions, onCardMoved, setEditingStatus],
  );

  useEffect(() => {
    if (!dragState) return;

    let rafId = 0;
    let latestX = 0;
    let latestY = 0;
    let hasLatest = false;

    const applyTransform = () => {
      if (hasLatest && dragState) {
        setLocalPositions((prev) => {
          const next = new Map(prev);
          next.set(dragState.cardId, { x: latestX, y: latestY });
          return next;
        });
        hasLatest = false;
      }
      rafId = requestAnimationFrame(applyTransform);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const x = e.clientX - rect.left - dragState.offsetX + board.scrollLeft;
      const y = e.clientY - rect.top - dragState.offsetY + board.scrollTop;
      latestX = Math.max(0, x);
      latestY = Math.max(0, y);
      hasLatest = true;
      if (!dragState.moved) {
        setDragState((s) => (s ? { ...s, moved: true } : s));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState) return;
      const touch = e.touches[0];
      if (!touch) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const x = touch.clientX - rect.left - dragState.offsetX + board.scrollLeft;
      const y = touch.clientY - rect.top - dragState.offsetY + board.scrollTop;
      latestX = Math.max(0, x);
      latestY = Math.max(0, y);
      hasLatest = true;
      if (!dragState.moved) {
        setDragState((s) => (s ? { ...s, moved: true } : s));
      }
      e.preventDefault();
    };

    const handleEnd = () => {
      cancelAnimationFrame(rafId);
      if (dragState) {
        const pos = localPositions.get(dragState.cardId);
        const card = cardsMap.get(dragState.cardId);
        if (pos && card) {
          onCardMoved?.(dragState.cardId, pos.x, pos.y, zIndexCounter.current);
        }
      }
      setDragState(null);
      setDraggingCardId(null);
    };

    rafId = requestAnimationFrame(applyTransform);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragState, localPositions, cardsMap, onCardMoved]);

  const handleCardContentChange = useCallback(
    (cardId: string, content: string) => {
      onCardUpdated?.(cardId, { content });
      setEditingStatus();
    },
    [onCardUpdated, setEditingStatus],
  );

  const handleCardColorChange = useCallback(
    (cardId: string, color: string | null) => {
      onCardUpdated?.(cardId, { color });
      setEditingStatus();
    },
    [onCardUpdated, setEditingStatus],
  );

  const sortedCards = useMemo(() => {
    return [...session.cards].sort((a, b) => a.zIndex - b.zIndex);
  }, [session.cards]);

  const renderCards = sortedCards.map((card) => {
    const lp = localPositions.get(card.id);
    const cardWithPos = lp && dragState?.cardId === card.id
      ? { ...card, x: lp.x, y: lp.y }
      : card;
    return (
      <IdeaCard
        key={card.id}
        card={cardWithPos}
        isDragging={draggingCardId === card.id}
        isVotingPhase={phase !== 'brainstorm'}
        readOnly={card.authorId !== currentUserId && phase !== 'brainstorm'}
        onContentChange={handleCardContentChange}
        onColorChange={handleCardColorChange}
        onDelete={onCardDeleted}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
    );
  });

  return (
    <div
      ref={boardRef}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: 600,
        background: '#f5f0eb',
        borderRadius: 16,
        overflow: 'auto',
        minHeight: 600,
      }}
    >
      <div
        style={{
          position: 'relative',
          minWidth: '100%',
          minHeight: '100%',
          width: 3000,
          height: 2000,
        }}
      >
        {renderCards}
        {session.cards.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#aaa',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>💡</div>
            <div style={{ fontSize: 16 }}>
              {phase === 'brainstorm' ? '双击空白处开始创建想法卡片' : '脑暴阶段已结束，等待投票...'}
            </div>
            {phase === 'brainstorm' && (
              <div style={{ fontSize: 12, marginTop: 6, color: '#bbb' }}>
                拖动卡片调整位置 · 编辑内容 · 选择标签颜色
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
