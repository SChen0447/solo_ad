import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameEvent } from '../utils/gameLogic';

interface EventDeckProps {
  event: GameEvent | null;
  onAnimationComplete?: () => void;
}

const EventDeck: React.FC<EventDeckProps> = ({ event, onAnimationComplete }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (event) {
      setIsFlipped(false);
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
      }, 2000);
      const completeTimer = setTimeout(() => {
        onAnimationComplete?.();
      }, 3500);
      return () => {
        clearTimeout(flipTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [event, onAnimationComplete]);

  const getEventGradient = (type: string) => {
    switch (type) {
      case 'gain':
      case 'bonus':
        return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      case 'lose':
        return 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)';
      case 'freeze':
        return 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)';
      case 'double':
        return 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)';
      default:
        return 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'gain':
      case 'bonus':
        return '🌟';
      case 'lose':
        return '💔';
      case 'freeze':
        return '❄️';
      case 'double':
        return '⚡';
      default:
        return '🎲';
    }
  };

  if (!event) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={event.id}
        initial={{
          opacity: 0,
          x: isMobile ? 0 : -300,
          y: isMobile ? -200 : -150,
          rotate: isMobile ? -20 : -45,
          scale: 0.5,
        }}
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 100,
          scale: 0.8,
          transition: { duration: 0.3 },
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 25,
          duration: 0.8,
        }}
        style={{
          position: 'fixed',
          top: isMobile ? '20px' : '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          perspective: '1000px',
        }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          style={{
            width: '260px',
            height: '360px',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              borderRadius: '20px',
              padding: '24px',
              background: getEventGradient(event.type),
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(138, 43, 226, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ fontSize: '72px', marginBottom: '16px' }}
            >
              {getEventIcon(event.type)}
            </motion.div>

            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                marginBottom: '12px',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                textAlign: 'center',
              }}
            >
              {event.name}
            </div>

            <div
              style={{
                fontSize: '15px',
                opacity: 0.95,
                textAlign: 'center',
                marginBottom: '20px',
                padding: '0 8px',
              }}
            >
              {event.description}
            </div>

            {event.value !== 0 && (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '42px',
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(255, 255, 255, 0.6)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '8px 24px',
                  borderRadius: '12px',
                }}
              >
                {event.value > 0 ? '+' : ''}{event.value}
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                right: '12px',
                bottom: '12px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '14px',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              style={{ opacity: 0.9 }}
            >
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8E2DE2" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4A00E0" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#FFE66D" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <motion.circle
                cx="100"
                cy="80"
                r="45"
                fill="url(#grad1)"
                animate={{ r: [45, 50, 45], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.polygon
                points="60,150 100,100 140,150"
                fill="url(#grad2)"
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                style={{ transformOrigin: '100px 125px' }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.rect
                x="85"
                y="160"
                width="30"
                height="20"
                rx="4"
                fill="#4ECDC4"
                opacity="0.8"
                animate={{ y: [160, 155, 160], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                letterSpacing: '2px',
              }}
            >
              EVENT CARD
            </div>
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                right: '12px',
                bottom: '12px',
                border: '2px solid rgba(138, 43, 226, 0.4)',
                borderRadius: '14px',
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EventDeck;
