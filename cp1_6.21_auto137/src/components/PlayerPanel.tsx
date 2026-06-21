import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../utils/gameLogic';

interface PlayerPanelProps {
  player: Player;
  isActive: boolean;
  isCurrentTurn: boolean;
  onEndTurn: () => void;
  onAddScore: (score: number) => void;
}

interface FloatingScore {
  id: number;
  value: number;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isActive,
  isCurrentTurn,
  onEndTurn,
  onAddScore,
}) => {
  const [displayScore, setDisplayScore] = useState(player.score);
  const [flashType, setFlashType] = useState<'gain' | 'lose' | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const animationRef = useRef<number | null>(null);
  const prevScoreRef = useRef(player.score);
  const floatIdRef = useRef(0);

  useEffect(() => {
    const oldScore = prevScoreRef.current;
    const newScore = player.score;

    if (oldScore !== newScore) {
      const diff = newScore - oldScore;

      if (diff > 0) {
        setFlashType('gain');
      } else if (diff < 0) {
        setFlashType('lose');
      }

      const floatId = ++floatIdRef.current;
      setFloatingScores((prev) => [...prev, { id: floatId, value: diff }]);
      setTimeout(() => {
        setFloatingScores((prev) => prev.filter((f) => f.id !== floatId));
      }, 1200);

      const startScore = oldScore;
      const startTime = performance.now();
      const duration = 300;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startScore + (newScore - startScore) * easeProgress);
        setDisplayScore(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      setTimeout(() => setFlashType(null), 400);

      prevScoreRef.current = newScore;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [player.score]);

  const getStatusText = () => {
    if (player.isFrozen) return '已冻结';
    if (player.activeEvent?.type === 'double') return '双倍加成';
    return isCurrentTurn ? '你的回合' : '';
  };

  const getStatusColor = () => {
    if (player.isFrozen) return '#888';
    if (player.activeEvent?.type === 'double') return '#FFE66D';
    return player.color;
  };

  const panelBorder = player.isFrozen
    ? '3px dashed #666'
    : isCurrentTurn
    ? `3px solid ${player.color}`
    : '3px solid transparent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        border: panelBorder,
        boxShadow: flashType === 'gain'
          ? '0 0 20px rgba(72, 187, 120, 0.6)'
          : flashType === 'lose'
          ? '0 0 20px rgba(245, 101, 101, 0.6)'
          : isCurrentTurn
          ? `0 0 20px ${player.color}55`
          : '0 4px 20px rgba(0, 0, 0, 0.3)',
        transition: 'box-shadow 0.4s ease',
        minWidth: '240px',
        flex: '1 1 240px',
      }}
    >
      <AnimatePresence>
        {floatingScores.map((fs) => (
          <motion.div
            key={fs.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '60px',
              right: '30px',
              fontFamily: 'monospace',
              fontSize: '28px',
              fontWeight: 'bold',
              color: fs.value > 0 ? '#48bb78' : '#f56565',
              textShadow: '0 0 10px currentColor',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            {fs.value > 0 ? '+' : ''}{fs.value}
          </motion.div>
        ))}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${player.color}, ${player.color}88)`,
            boxShadow: `0 0 12px ${player.color}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            flexShrink: 0,
          }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {player.name}
          </div>
          {getStatusText() && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                background: `${getStatusColor()}33`,
                color: getStatusColor(),
                border: `1px solid ${getStatusColor()}55`,
              }}
            >
              {getStatusText()}
            </motion.div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>当前积分</div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '42px',
            fontWeight: 'bold',
            textShadow: '0 0 8px rgba(255,255,255,0.4)',
            lineHeight: 1,
            color: flashType === 'gain'
              ? '#48bb78'
              : flashType === 'lose'
              ? '#f56565'
              : '#fff',
            transition: 'color 0.3s ease',
          }}
        >
          {displayScore}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3].map((n) => (
            <motion.button
              key={n}
              whileHover={{ scale: isActive && !player.isFrozen ? 1.05 : 1 }}
              whileTap={{ scale: isActive && !player.isFrozen ? 0.95 : 1 }}
              onClick={() => isActive && !player.isFrozen && onAddScore(n)}
              disabled={!isActive || player.isFrozen}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isActive && !player.isFrozen ? 'pointer' : 'not-allowed',
                background: isActive && !player.isFrozen
                  ? `linear-gradient(135deg, ${player.color}aa, ${player.color}66)`
                  : 'rgba(255,255,255,0.05)',
                color: isActive && !player.isFrozen ? '#fff' : '#666',
                transition: 'all 0.2s ease',
                opacity: isActive && !player.isFrozen ? 1 : 0.5,
              }}
            >
              +{n}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: isCurrentTurn && !player.isFrozen ? 1.05 : 1 }}
          whileTap={{ scale: isCurrentTurn && !player.isFrozen ? 0.95 : 1 }}
          onClick={() => isCurrentTurn && !player.isFrozen && onEndTurn()}
          disabled={!isCurrentTurn || player.isFrozen}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isCurrentTurn && !player.isFrozen ? 'pointer' : 'not-allowed',
            background: isCurrentTurn && !player.isFrozen
              ? `linear-gradient(135deg, ${player.color}, ${player.color}cc)`
              : 'rgba(255,255,255,0.05)',
            color: isCurrentTurn && !player.isFrozen ? '#fff' : '#666',
            boxShadow: isCurrentTurn && !player.isFrozen
              ? `0 4px 15px ${player.color}55`
              : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {player.isFrozen ? '已冻结' : isCurrentTurn ? '回合结束' : '等待中...'}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PlayerPanel;
