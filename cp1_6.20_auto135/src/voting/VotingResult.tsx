import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IdeaCardData } from '../types';
import { CARD_WIDTH, CARD_HEIGHT } from '../types';

interface VotingResultProps {
  cards: IdeaCardData[];
  onReset?: () => void;
  isHost?: boolean;
}

const RANK_STYLES: Record<number, {
  background: string;
  textColor: string;
  badgeBg: string;
  label: string;
  shadow: string;
  border?: string;
}> = {
  0: {
    background: 'linear-gradient(135deg, #ffd43b 0%, #ffb005 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255,255,255,0.25)',
    label: '🥇 第一名',
    shadow: '0 18px 40px rgba(255,176,5,0.4)',
    border: '2px solid #ffc300',
  },
  1: {
    background: 'linear-gradient(135deg, #dee2e6 0%, #ced4da 100%)',
    textColor: '#495057',
    badgeBg: 'rgba(73,80,87,0.15)',
    label: '🥈 第二名',
    shadow: '0 16px 32px rgba(152,160,169,0.3)',
    border: '2px solid #adb5bd',
  },
  2: {
    background: 'linear-gradient(135deg, #d8a97b 0%, #cd9b5b 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255,255,255,0.25)',
    label: '🥉 第三名',
    shadow: '0 14px 30px rgba(205,155,91,0.4)',
    border: '2px solid #b8864a',
  },
};

export const VotingResult: React.FC<VotingResultProps> = ({
  cards,
  onReset,
  isHost = false,
}) => {
  const rankedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const diff = b.votes.length - a.votes.length;
      if (diff !== 0) return diff;
      return a.createdAt - b.createdAt;
    });
  }, [cards]);

  const totalVotes = useMemo(
    () => cards.reduce((s, c) => s + c.votes.length, 0),
    [cards],
  );

  const renderCard = (card: IdeaCardData, index: number) => {
    const style = RANK_STYLES[index];
    const isTop = index < 3;
    const votes = card.votes.length;

    return (
      <motion.div
        key={card.id}
        layout
        initial={{ y: 120, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -60, opacity: 0, scale: 0.8 }}
        transition={{
          duration: 0.5,
          delay: index * 0.1,
          type: 'spring',
          stiffness: 150,
          damping: 18,
        }}
        whileHover={
          isTop
            ? { scale: 1.04, y: -6 }
            : { scale: 1.02, y: -2 }
        }
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          minHeight: 180,
          borderRadius: isTop ? 18 : 14,
          background: style?.background || '#ffffff',
          color: style?.textColor || '#333',
          boxShadow: style?.shadow || '0 6px 20px rgba(0,0,0,0.08)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: style?.border || 'none',
          overflow: 'hidden',
        }}
      >
        {isTop && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.1 + 0.3,
              type: 'spring',
              stiffness: 250,
              damping: 12,
            }}
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              padding: '6px 14px',
              borderRadius: 12,
              background: style.badgeBg,
              color: style.textColor,
              fontWeight: 'bold',
              fontSize: 14,
              backdropFilter: 'blur(4px)',
              transform: 'rotate(-6deg)',
              letterSpacing: 0.5,
            }}
          >
            {style.label}
          </motion.div>
        )}

        {!isTop && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#adb5bd',
            }}
          >
            #{index + 1}
          </div>
        )}

        <div style={{ paddingTop: isTop ? 6 : 0 }}>
          <div
            style={{
              fontSize: isTop ? 20 : 16,
              fontWeight: isTop ? 700 : 500,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: isTop ? 80 : 60,
            }}
          >
            {card.content || <span style={{ opacity: 0.5 }}>（空卡片）</span>}
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isTop
                  ? 'rgba(255,255,255,0.3)'
                  : 'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)',
                color: isTop ? style.textColor : '#fff',
                fontSize: 11,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.authorName.charAt(0).toUpperCase() || '?'}
            </div>
            <span style={{ fontWeight: 500 }}>{card.authorName}</span>
            {card.color && !isTop && (
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: card.color,
                }}
              />
            )}
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: index * 0.1 + 0.2,
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              background: isTop ? style.badgeBg : 'rgba(255,146,43,0.12)',
              color: isTop ? style.textColor : '#ff922b',
              fontWeight: 'bold',
              fontSize: 14,
              boxShadow: isTop ? 'none' : '0 2px 8px rgba(255,146,43,0.15)',
            }}
          >
            <span style={{ fontSize: 16 }}>⭐</span>
            <span>{votes}</span>
            <span style={{ fontWeight: 400, opacity: 0.8, fontSize: 12 }}>票</span>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <div
      style={{
        padding: '20px 0',
        maxWidth: 560,
        margin: '0 auto',
      }}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          textAlign: 'center',
          marginBottom: 36,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 12 }}
          style={{
            fontSize: 64,
            marginBottom: 12,
          }}
        >
          🏆
        </motion.div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            background: 'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: 1,
          }}
        >
          投票结果出炉！
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#888',
            marginTop: 8,
          }}
        >
          共收到 <span style={{ color: '#ff922b', fontWeight: 700 }}>{totalVotes}</span> 票，
          <span style={{ color: '#ff922b', fontWeight: 700 }}>{cards.length}</span> 个创意参与评选
        </p>
      </motion.div>

      <AnimatePresence mode="popLayout">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            alignItems: 'center',
          }}
        >
          {rankedCards.length > 0 ? (
            rankedCards.map((card, i) => renderCard(card, i))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: 60,
                textAlign: 'center',
                color: '#999',
                background: '#f5f0eb',
                borderRadius: 16,
                width: '100%',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤷</div>
              <div>没有任何投票记录</div>
            </motion.div>
          )}
        </div>
      </AnimatePresence>

      {isHost && onReset && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + Math.min(cards.length, 10) * 0.1 }}
          style={{
            marginTop: 40,
            textAlign: 'center',
          }}
        >
          <button
            onClick={onReset}
            style={{
              padding: '12px 28px',
              border: 'none',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(255,146,43,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(255,146,43,0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,146,43,0.35)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            🔄 重新开始新一轮脑暴
          </button>
        </motion.div>
      )}
    </div>
  );
};
