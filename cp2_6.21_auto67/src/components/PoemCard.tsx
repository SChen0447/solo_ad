import React, { useState, useCallback, useRef, memo } from 'react';
import type { Poem, Ripple } from '../types';
import { generateId } from '../utils';

interface PoemCardProps {
  poem: Poem;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onCardClick: () => void;
}

const PoemCard: React.FC<PoemCardProps> = ({
  poem,
  x,
  y,
  rotation,
  opacity,
  isExpanded,
  onToggleExpand,
  onCardClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const rippleCleanupRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const rippleX = e.clientX - rect.left;
      const rippleY = e.clientY - rect.top;
      const ripple: Ripple = {
        id: generateId(),
        x: rippleX,
        y: rippleY,
        startTime: Date.now()
      };
      setRipples(prev => [...prev, ripple]);
      
      const cleanupTimer = setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== ripple.id));
      }, 500);
      rippleCleanupRef.current.push(cleanupTimer);
    }
    
    onToggleExpand(poem.id);
    onCardClick();
  }, [poem.id, onToggleExpand, onCardClick]);

  React.useEffect(() => {
    return () => {
      rippleCleanupRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const backgroundOpacity = isHovered ? 0.95 : 0.85;
  const scale = isHovered ? 1.08 : 1;
  const shadowSize = isHovered ? 20 : 10;

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: isExpanded ? 'calc(100% - 60px)' : 320,
        transform: `translateY(-50%) rotate(${rotation}deg) scale(${scale}) ${isExpanded ? 'translate(-50%, 0)' : ''}`,
        ...(isExpanded ? {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          position: 'fixed',
          zIndex: 1000,
          maxWidth: 600,
          maxHeight: '80vh',
          overflowY: 'auto'
        } : {}),
        opacity,
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out, opacity 0.3s ease-out, width 0.3s ease-out',
        backgroundColor: `rgba(250, 240, 230, ${backgroundOpacity})`,
        borderRadius: 4,
        padding: '24px 20px',
        boxShadow: `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, ${isHovered ? 0.3 : 0.15})`,
        cursor: 'pointer',
        backdropFilter: 'blur(2px)',
        border: '1px solid rgba(139, 69, 19, 0.15)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          opacity: 0.6
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2
          style={{
            margin: 0,
            fontSize: isExpanded ? 28 : 24,
            fontWeight: 700,
            color: '#2C1810',
            fontFamily: '"KaiTi", "STKaiti", "楷体", "SimSun", serif',
            marginBottom: 8,
            letterSpacing: 2,
            textAlign: 'center',
            textShadow: '1px 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {poem.title}
        </h2>

        <div
          style={{
            fontSize: 14,
            color: '#8B4513',
            fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
            marginBottom: 16,
            textAlign: 'center',
            fontStyle: 'italic',
            letterSpacing: 1
          }}
        >
          【{poem.dynasty}】{poem.author}
        </div>

        <div
          style={{
            width: '60%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, #8B4513, transparent)',
            margin: '0 auto 16px auto',
            opacity: 0.4
          }}
        />

        <div
          style={{
            fontSize: isExpanded ? 20 : 18,
            lineHeight: 1.9,
            color: '#4A3728',
            fontFamily: '"KaiTi", "STKaiti", "楷体", "SimSun", serif',
            textAlign: 'center',
            letterSpacing: 1.5
          }}
        >
          {poem.content.map((line, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: idx < poem.content.length - 1 ? 4 : 0,
                animation: isHovered ? `fadeInUp 0.5s ease-out ${idx * 0.05}s both` : 'none'
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {isExpanded && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid rgba(139, 69, 19, 0.2)',
              animation: 'expandIn 0.3s ease-out'
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: '#8B4513',
                fontWeight: 600,
                marginBottom: 8,
                fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
                letterSpacing: 1
              }}
            >
              【注释赏析】
            </div>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                color: '#5D4E37',
                fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
                textAlign: 'justify',
                textIndent: '2em',
                letterSpacing: 0.5
              }}
            >
              {poem.notes}
            </div>
          </div>
        )}
      </div>

      {ripples.map(ripple => (
        <div
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            borderRadius: '50%',
            backgroundColor: 'rgba(139, 69, 19, 0.6)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            animation: 'ripple 0.5s ease-out forwards'
          }}
        />
      ))}

      <style>{`
        @keyframes ripple {
          0% {
            width: 0;
            height: 0;
            opacity: 0.6;
          }
          100% {
            width: 120px;
            height: 120px;
            opacity: 0;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes expandIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default memo(PoemCard, (prevProps, nextProps) => {
  return (
    prevProps.poem.id === nextProps.poem.id &&
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.isExpanded === nextProps.isExpanded
  );
});
