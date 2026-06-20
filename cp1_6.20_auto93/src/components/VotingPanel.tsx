import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Idea } from '@/types';

interface Props {
  ideas: Idea[];
  isEnded: boolean;
  onClose?: () => void;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

const CONFETTI_COLORS = [
  '#f59e0b', '#ef4444', '#10b981', '#667eea', '#ec4899',
  '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#eab308',
];

const GOLD_MEDAL = '🥇';
const SILVER_MEDAL = '🥈';
const BRONZE_MEDAL = '🥉';

const VotingPanel: React.FC<Props> = ({ ideas, isEnded, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const confettiRef = useRef<Confetti[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const topIdeas = ideas.slice(0, 10);

  useEffect(() => {
    if (isEnded) {
      setShowConfetti(true);
      startConfetti();
    }
    return () => {
      stopConfetti();
    };
  }, [isEnded]);

  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    confettiRef.current = [];
    for (let i = 0; i < 120; i++) {
      confettiRef.current.push(createConfetti(W(), H(), true));
    }

    const loop = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const c of confettiRef.current) {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15;
        c.rotation += c.rotSpeed;

        if (c.y > H() + 20) {
          Object.assign(c, createConfetti(W(), H(), false));
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        ctx.restore();
      }

      if (confettiRef.current.length < 60 && Math.random() < 0.3) {
        confettiRef.current.push(createConfetti(W(), H(), true));
      }

      animRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const stopConfetti = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
  };

  const createConfetti = (W: number, H: number, fromTop: boolean): Confetti => ({
    x: Math.random() * W,
    y: fromTop ? -Math.random() * H : -20,
    vx: (Math.random() - 0.5) * 2,
    vy: 1 + Math.random() * 2.5,
    size: 4 + Math.random() * 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
  });

  const getRankStyle = (rank: number): React.CSSProperties => {
    if (rank === 0) return { background: 'linear-gradient(135deg,#fde68a,#f59e0b)', color: '#78350f' };
    if (rank === 1) return { background: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', color: '#1e293b' };
    if (rank === 2) return { background: 'linear-gradient(135deg,#fed7aa,#d97706)', color: '#7c2d12' };
    return { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' };
  };

  const getMedal = (rank: number): string | null => {
    if (rank === 0) return GOLD_MEDAL;
    if (rank === 1) return SILVER_MEDAL;
    if (rank === 2) return BRONZE_MEDAL;
    return null;
  };

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(44,62,80,0.92)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        borderRadius: onClose ? '20px 20px 0 0' : 14,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {showConfetti && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '18px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {isEnded ? '最终排名' : '实时排行榜'}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20, padding: 4 }}
          >
            ×
          </button>
        )}
      </div>

      {isEnded && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            margin: '0 18px 14px',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(245,158,11,0.2)',
            border: '1px solid rgba(245,158,11,0.3)',
            fontSize: 12,
            color: '#fde68a',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          🎊 投票已结束，恭喜获胜方案！
        </div>
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '4px 18px 20px',
          maxHeight: onClose ? 'calc(80vh - 140px)' : 'calc(100vh - 240px)',
          overflowY: 'auto',
        }}
      >
        {topIdeas.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
            }}
          >
            暂无卡片
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topIdeas.map((idea, idx) => {
              const medal = getMedal(idx);
              const isTop3 = idx < 3;
              return (
                <motion.div
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: isTop3 && isEnded ? '12px 12px' : '10px 12px',
                    borderRadius: 10,
                    background:
                      isTop3 && isEnded
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.04)',
                    border: isTop3 && isEnded ? '1px solid rgba(245,158,11,0.3)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: medal ? 16 : 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      ...getRankStyle(idx),
                    }}
                  >
                    {medal || (idx + 1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#fff',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={idea.title}
                    >
                      {idea.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 2,
                      }}
                    >
                      {idea.author_name}
                    </div>
                  </div>
                  <motion.div
                    key={idea.votes}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    style={{
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: 20,
                      background:
                        idx === 0
                          ? 'rgba(245,158,11,0.2)'
                          : idx === 1
                          ? 'rgba(148,163,184,0.2)'
                          : idx === 2
                          ? 'rgba(217,119,6,0.2)'
                          : 'rgba(255,255,255,0.08)',
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        idx === 0
                          ? '#fde68a'
                          : idx === 1
                          ? '#e2e8f0'
                          : idx === 2
                          ? '#fed7aa'
                          : 'rgba(255,255,255,0.75)',
                      minWidth: 44,
                      textAlign: 'center',
                    }}
                  >
                    {idea.votes} 票
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}

        {ideas.length > 10 && (
          <div
            style={{
              marginTop: 12,
              textAlign: 'center',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            还有 {ideas.length - 10} 个创意
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingPanel;
