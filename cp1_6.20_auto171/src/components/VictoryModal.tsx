import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface VictoryModalProps {
  winner: 'player' | 'ai';
  onClose: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  delay: number;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ winner, onClose }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    const colors = ['#f1c40f', '#f39c12', '#e67e22', '#d35400', '#f1c40f'];

    for (let i = 0; i < 50; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: i,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.5,
      });
    }
    setParticles(newParticles);
  }, [winner]);

  const isPlayerWinner = winner === 'player';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ x: '50%', y: '50%', opacity: 0, scale: 0 }}
            animate={{
              x: `calc(50% + ${particle.vx * 30}vw)`,
              y: `calc(50% + ${particle.vy * 30}vh)`,
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              delay: particle.delay,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: '50%',
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          duration: 0.5,
        }}
        style={{
          backgroundColor: '#16213e',
          borderRadius: '16px',
          padding: '40px 60px',
          textAlign: 'center',
          border: '2px solid #0f3460',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1
            style={{
              fontSize: '36px',
              marginBottom: '20px',
              color: isPlayerWinner ? '#f1c40f' : '#e74c3c',
              textShadow: isPlayerWinner ? '0 0 20px #f1c40f' : '0 0 20px #e74c3c',
            }}
          >
            {isPlayerWinner ? '🎉 胜利！' : '💀 失败...'}
          </h1>
          <p style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '30px' }}>
            {isPlayerWinner ? '你成功击败了AI对手！' : 'AI击败了你，再接再厉！'}
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '14px 40px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #e94560, #c23152)',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'filter 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            再来一局
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
