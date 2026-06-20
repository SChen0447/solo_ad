import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flipper, Flipped } from 'react-flip-toolkit';
import type { IdeaCardData, User } from '../types';
import { CARD_WIDTH, CARD_HEIGHT, MAX_VOTES_PER_USER, TAG_COLORS } from '../types';
import { formatTime } from '../whiteboard/utils';

interface VotingBoardProps {
  cards: IdeaCardData[];
  currentUserId: string;
  users: User[];
  votingEndAt: number;
  onVoteAdded?: (cardId: string) => void;
  onVoteRemoved?: (cardId: string) => void;
  onTimeUp?: () => void;
}

export const VotingBoard: React.FC<VotingBoardProps> = ({
  cards,
  currentUserId,
  votingEndAt,
  onVoteAdded,
  onVoteRemoved,
  onTimeUp,
}) => {
  const [remaining, setRemaining] = useState(() => Math.max(0, votingEndAt - Date.now() / 1000));
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [isOverHotzone, setIsOverHotzone] = useState(false);
  const [draggingPos, setDraggingPos] = useState<{ x: number; y: number } | null>(null);
  const [pulse, setPulse] = useState(false);
  const hotzoneRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const r = Math.max(0, votingEndAt - Date.now() / 1000);
      setRemaining(r);
      setPulse((p) => !p);
      if (r <= 0) {
        window.clearInterval(id);
        onTimeUp?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [votingEndAt, onTimeUp]);

  const votedByMe = useMemo(() => {
    const s = new Set<string>();
    cards.forEach((c) => {
      if (c.votes.includes(currentUserId)) s.add(c.id);
    });
    return s;
  }, [cards, currentUserId]);

  const votesCount = useMemo(() => {
    const m = new Map<string, number>();
    cards.forEach((c) => m.set(c.id, c.votes.length));
    return m;
  }, [cards]);

  const myVotesLeft = MAX_VOTES_PER_USER - votedByMe.size;

  const sortedByVotes = useMemo(() => {
    return [...cards]
      .filter((c) => c.votes.length > 0)
      .sort((a, b) => {
        const diff = b.votes.length - a.votes.length;
        if (diff !== 0) return diff;
        return a.createdAt - b.createdAt;
      });
  }, [cards]);

  const nonHotCards = useMemo(() => {
    return cards.filter((c) => !sortedByVotes.find((h) => h.id === c.id));
  }, [cards, sortedByVotes]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const isVoted = votedByMe.has(cardId);
      if (!isVoted && myVotesLeft <= 0) {
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setDragCardId(cardId);
      setDraggingPos({
        x: clientX - rect.left - CARD_WIDTH / 2,
        y: clientY - rect.top - CARD_HEIGHT / 2,
      });
      e.preventDefault();
    },
    [cards, votedByMe, myVotesLeft],
  );

  useEffect(() => {
    if (!dragCardId) return;

    let rafId = 0;
    let latest: { x: number; y: number } | null = null;
    let targetHotzone = false;

    const loop = () => {
      if (latest) {
        setDraggingPos(latest);
        const hz = hotzoneRef.current;
        if (hz) {
          const r = hz.getBoundingClientRect();
          const cx = latest.x;
          const cy = latest.y;
          const container = containerRef.current;
          const crect = container?.getBoundingClientRect();
          if (crect) {
            const absX = cx + crect.left + CARD_WIDTH / 2;
            const absY = cy + crect.top + CARD_HEIGHT / 2;
            const inHz =
              absX >= r.left && absX <= r.right && absY >= r.top && absY <= r.bottom;
            if (inHz !== targetHotzone) {
              targetHotzone = inHz;
              setIsOverHotzone(inHz);
            }
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onMove = (e: MouseEvent | TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      latest = {
        x: clientX - rect.left - CARD_WIDTH / 2,
        y: clientY - rect.top - CARD_HEIGHT / 2,
      };
    };

    const onEnd = () => {
      cancelAnimationFrame(rafId);
      if (dragCardId) {
        const isVoted = votedByMe.has(dragCardId);
        if (targetHotzone) {
          if (!isVoted) {
            onVoteAdded?.(dragCardId);
          }
        } else {
          if (isVoted) {
            onVoteRemoved?.(dragCardId);
          }
        }
      }
      setDragCardId(null);
      setDraggingPos(null);
      setIsOverHotzone(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [dragCardId, votedByMe, onVoteAdded, onVoteRemoved]);

  const renderCard = (card: IdeaCardData, inHotzone: boolean, idx: number) => {
    const isDragging = dragCardId === card.id;
    const isVoted = votedByMe.has(card.id);
    const canDrag = inHotzone ? isVoted : (isVoted || myVotesLeft > 0);
    const voteCount = votesCount.get(card.id) || 0;

    return (
      <Flipped key={card.id} flipId={`card-${card.id}`} stagger={idx * 30}>
        <motion.div
          data-card-id={card.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: isDragging ? 0 : 1,
            scale: 1,
          }}
          transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
          onMouseDown={(e) => canDrag && handleDragStart(e, card.id)}
          onTouchStart={(e) => canDrag && handleDragStart(e, card.id)}
          style={{
            position: 'relative',
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: isVoted
              ? '0 6px 20px rgba(255, 146, 43, 0.25)'
              : '0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            cursor: canDrag ? 'grab' : 'not-allowed',
            border: isVoted ? '2px solid #ff922b' : '2px solid transparent',
            flexShrink: 0,
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              height: 4,
              width: '100%',
              background: card.color || (inHotzone ? '#ffd43b' : 'transparent'),
              flexShrink: 0,
            }}
          />
          {inHotzone && voteCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                minWidth: 28,
                height: 28,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 8px',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(255,146,43,0.4)',
              }}
            >
              {voteCount}票
            </motion.div>
          )}
          <div
            style={{
              padding: '10px 12px',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: '#333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {card.content || <span style={{ color: '#ccc' }}>（空卡片）</span>}
            </div>
          </div>
          <div
            style={{
              padding: '0 12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              fontSize: 12,
              color: '#999',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.authorName.charAt(0).toUpperCase() || '?'}
            </div>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {card.authorName}
            </span>
            {!inHotzone && voteCount > 0 && (
              <span style={{ color: '#ff922b', fontWeight: 600 }}>{voteCount}票</span>
            )}
          </div>
        </motion.div>
      </Flipped>
    );
  };

  const draggingCard = dragCardId ? cards.find((c) => c.id === dragCardId) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <motion.span
            key={pulse ? 'a' : 'b'}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: remaining <= 30 ? '#e03131' : '#ff922b',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 1,
              textShadow: remaining <= 30 ? '0 0 12px rgba(224,49,49,0.3)' : 'none',
              transition: 'color 0.3s',
            }}
          >
            {formatTime(remaining)}
          </motion.span>
          <span style={{ fontSize: 14, color: '#888' }}>投票倒计时</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14, color: '#666' }}>剩余投票额度：</span>
          {Array.from({ length: MAX_VOTES_PER_USER }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background:
                  i < myVotesLeft
                    ? 'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)'
                    : '#e9ecef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: i < myVotesLeft ? '#fff' : '#adb5bd',
                boxShadow:
                  i < myVotesLeft ? '0 2px 6px rgba(255,146,43,0.3)' : 'none',
              }}
            >
              {i < myVotesLeft ? '★' : '☆'}
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        ref={hotzoneRef}
        animate={{
          background: isOverHotzone
            ? 'rgba(255, 212, 59, 0.3)'
            : 'rgba(255, 212, 59, 0.15)',
          borderColor: isOverHotzone ? '#ffd43b' : 'rgba(255, 212, 59, 0.5)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          padding: 20,
          borderRadius: 12,
          border: '2px dashed #ffd43b',
          minHeight: CARD_HEIGHT + 40,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: '#caa70f',
            marginBottom: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🔥</span>
          <span>热门区 — 拖入卡片投票，拖出取消投票</span>
        </div>
        <Flipper flipKey={sortedByVotes.map((c) => c.id).join(',')} spring={{ stiffness: 300, damping: 28 }}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              minHeight: sortedByVotes.length > 0 ? 0 : CARD_HEIGHT,
              alignItems: 'flex-start',
            }}
          >
            <AnimatePresence mode="popLayout">
              {sortedByVotes.map((card, i) => renderCard(card, true, i))}
            </AnimatePresence>
            {sortedByVotes.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  width: '100%',
                  height: CARD_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c0a644',
                  fontSize: 14,
                  border: '1px dashed rgba(255,212,59,0.4)',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.4)',
                }}
              >
                将你认为最棒的 {MAX_VOTES_PER_USER} 个想法拖到这里 🌟
              </motion.div>
            )}
          </div>
        </Flipper>
      </motion.div>

      <div style={{ fontSize: 13, color: '#888', marginBottom: 12, fontWeight: 600 }}>
        📋 全部卡片（拖到上方热门区投票）
      </div>
      <Flipper flipKey={nonHotCards.map((c) => c.id + '_n').join(',')} spring={{ stiffness: 280, damping: 28 }}>
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            padding: 16,
            background: '#f5f0eb',
            borderRadius: 12,
            minHeight: nonHotCards.length > 0 ? 0 : CARD_HEIGHT + 32,
            alignItems: 'flex-start',
          }}
        >
          <AnimatePresence mode="popLayout">
            {nonHotCards.map((card, i) => renderCard(card, false, i))}
          </AnimatePresence>
          {nonHotCards.length === 0 && (
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                color: '#aaa',
                padding: '20px 0',
                fontSize: 14,
              }}
            >
              所有卡片都在热门区啦 ✨
            </div>
          )}
        </div>
      </Flipper>

      {draggingCard && draggingPos && (
        <motion.div
          initial={{ scale: 1.05, opacity: 0.95 }}
          animate={{ scale: 1.08, opacity: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            transform: `translate(${draggingPos.x + (containerRef.current?.getBoundingClientRect().left || 0)}px, ${draggingPos.y + (containerRef.current?.getBoundingClientRect().top || 0)}px) rotate(2deg)`,
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: 99999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              height: 4,
              width: '100%',
              background: draggingCard.color || '#ffd43b',
              flexShrink: 0,
            }}
          />
          <div style={{ padding: 12, flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: '#333',
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {draggingCard.content || '（空卡片）'}
            </div>
          </div>
          <div style={{ padding: '0 12px 10px', fontSize: 12, color: '#999' }}>
            {draggingCard.authorName}
          </div>
        </motion.div>
      )}
    </div>
  );
};
