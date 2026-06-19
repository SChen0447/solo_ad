import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IllustrationStyle, STYLE_INFO, Particle } from './types';

interface StyleZoneProps {
  style: IllustrationStyle;
  isHighlighted: boolean;
  feedback: 'correct' | 'wrong' | null;
  onFeedbackEnd: () => void;
}

const StyleZone: React.FC<StyleZoneProps> = ({ style, isHighlighted, feedback, onFeedbackEnd }) => {
  const info = STYLE_INFO[style];
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flashCount, setFlashCount] = useState(0);
  const animationRef = useRef<number>();
  const zoneRef = useRef<HTMLDivElement>(null);

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: '#f1c40f',
        size: 6 + Math.random() * 6
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  useEffect(() => {
    if (feedback === 'correct') {
      if (zoneRef.current) {
        const rect = zoneRef.current.getBoundingClientRect();
        const parentRect = zoneRef.current.parentElement?.getBoundingClientRect();
        if (parentRect) {
          createParticles(
            rect.left - parentRect.left + rect.width / 2,
            rect.top - parentRect.top + rect.height / 2
          );
        }
      }
      const timer = setTimeout(() => {
        onFeedbackEnd();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [feedback, createParticles, onFeedbackEnd]);

  useEffect(() => {
    if (feedback === 'wrong') {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setFlashCount(count);
        if (count >= 3) {
          clearInterval(interval);
          setTimeout(() => {
            onFeedbackEnd();
            setFlashCount(0);
          }, 200);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [feedback, onFeedbackEnd]);

  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2,
            life: p.life - 0.03
          }))
          .filter(p => p.life > 0)
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles.length]);

  const isWrongFlash = feedback === 'wrong' && flashCount % 2 === 1;

  return (
    <div
      ref={zoneRef}
      className={`style-zone ${isHighlighted ? 'highlighted' : ''} ${feedback === 'correct' ? 'correct' : ''} ${isWrongFlash ? 'wrong' : ''}`}
      style={{
        '--style-color': info.color,
        '--style-bg': info.bgColor
      } as React.CSSProperties}
    >
      <div className="zone-pattern" />
      <div className="zone-content">
        <div className="zone-icon" style={{ background: info.color }} />
        <span className="zone-name">{info.name}</span>
      </div>
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.life,
            transform: `rotate(${p.x * 3}deg) scale(${p.life})`
          }}
        />
      ))}
    </div>
  );
};

interface StyleZonesContainerProps {
  onZoneHover: (style: IllustrationStyle | null) => void;
  feedbacks: Record<IllustrationStyle, 'correct' | 'wrong' | null>;
  onFeedbackEnd: (style: IllustrationStyle) => void;
}

const StyleZonesContainer: React.FC<StyleZonesContainerProps> = ({
  onZoneHover,
  feedbacks,
  onFeedbackEnd
}) => {
  const styles: IllustrationStyle[] = [
    'ukiyo-e',
    'american-retro',
    'cyberpunk',
    'ink-wash',
    'pixel-art'
  ];

  const [hoveredStyle, setHoveredStyle] = useState<IllustrationStyle | null>(null);

  const handleMouseEnter = (style: IllustrationStyle) => {
    setHoveredStyle(style);
    onZoneHover(style);
  };

  const handleMouseLeave = () => {
    setHoveredStyle(null);
    onZoneHover(null);
  };

  return (
    <div
      className="style-zones-container"
      onMouseEnter={() => {}}
      onMouseLeave={handleMouseLeave}
    >
      <div className="zones-header">
        <h3>风格区域</h3>
        <span className="zones-hint">将卡牌拖放到对应风格</span>
      </div>
      <div className="style-zones-grid">
        {styles.map(style => (
          <div
            key={style}
            onMouseEnter={() => handleMouseEnter(style)}
            onMouseLeave={handleMouseLeave}
          >
            <StyleZone
              style={style}
              isHighlighted={hoveredStyle === style}
              feedback={feedbacks[style]}
              onFeedbackEnd={() => onFeedbackEnd(style)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StyleZonesContainer;
