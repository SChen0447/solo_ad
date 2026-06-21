import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { poems, Poem, EmotionTag, TAG_COLORS } from './PoemData';

interface FallingCard {
  poem: Poem;
  id: string;
  startX: number;
  startY: number;
  targetY: number;
  endY: number;
  rotation: number;
  offsetX: number;
  columnIndex: number;
  duration: number;
  fallen: boolean;
  revealed: boolean;
}

const CARD_WIDTH_DESKTOP = 320;
const CARD_WIDTH_TABLET = 260;
const CARD_WIDTH_MOBILE = 200;
const CARD_GAP = 60;

const PoemFall: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<FallingCard[]>([]);
  const [activeTag, setActiveTag] = useState<EmotionTag | null>(null);
  const [cardWidth, setCardWidth] = useState<number>(CARD_WIDTH_DESKTOP);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const animationFrameRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const usedPoemsRef = useRef<Set<number>>(new Set());
  const scrollYRef = useRef<number>(0);
  const fogOffsetRef = useRef<number>(0);
  const fogTimeRef = useRef<number>(0);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getRandomPoem = useCallback((): Poem => {
    const available = poems.filter(p => !usedPoemsRef.current.has(p.id));
    if (available.length === 0) {
      usedPoemsRef.current.clear();
      return poems[Math.floor(Math.random() * poems.length)];
    }
    const selected = available[Math.floor(Math.random() * available.length)];
    usedPoemsRef.current.add(selected.id);
    return selected;
  }, []);

  const calculateColumns = useCallback((): number => {
    if (!containerRef.current) return 3;
    const containerWidth = containerRef.current.clientWidth;
    return Math.max(1, Math.floor(containerWidth / (cardWidth + 40)));
  }, [cardWidth]);

  const spawnCard = useCallback(() => {
    const columns = calculateColumns();
    const columnIndex = Math.floor(Math.random() * columns);
    const poem = getRandomPoem();
    const startX = columnIndex * (cardWidth + 40) + 20;
    const offsetX = (Math.random() - 0.5) * 160;
    const rotation = (Math.random() - 0.5) * 10;

    const existingInColumn = cards.filter(c => c.columnIndex === columnIndex && c.fallen);
    const maxY = existingInColumn.length > 0
      ? Math.max(...existingInColumn.map(c => c.endY))
      : 0;

    const endY = maxY > 0 ? maxY + CARD_GAP + Math.random() * 40 : CARD_GAP + Math.random() * 100;

    const newCard: FallingCard = {
      poem,
      id: `${Date.now()}-${Math.random()}`,
      startX: startX + offsetX,
      startY: -500,
      targetY: endY,
      endY,
      rotation,
      offsetX,
      columnIndex,
      duration: 3000 + Math.random() * 2000,
      fallen: false,
      revealed: false
    };

    setCards(prev => [...prev, newCard]);

    setTimeout(() => {
      setCards(prev => prev.map(c =>
        c.id === newCard.id ? { ...c, fallen: true, revealed: true } : c
      ));
    }, newCard.duration / speedMultiplier);
  }, [cardWidth, calculateColumns, getRandomPoem, cards, speedMultiplier]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setCardWidth(CARD_WIDTH_MOBILE);
        setSpeedMultiplier(1.5);
      } else if (width <= 768) {
        setCardWidth(CARD_WIDTH_TABLET);
        setSpeedMultiplier(1);
      } else {
        setCardWidth(CARD_WIDTH_DESKTOP);
        setSpeedMultiplier(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastSpawnRef.current) lastSpawnRef.current = timestamp;
      const elapsed = timestamp - lastSpawnRef.current;

      if (elapsed > 1500 / speedMultiplier && cards.length < 30) {
        spawnCard();
        lastSpawnRef.current = timestamp;
      }

      fogTimeRef.current = (timestamp / 1000) % 10;
      fogOffsetRef.current = Math.sin(fogTimeRef.current * Math.PI / 5) * 5;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spawnCard, cards.length, speedMultiplier]);

  useEffect(() => {
    if (cards.length === 0) {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => spawnCard(), i * 300);
      }
    }
  }, []);

  const handleTagClick = (tag: EmotionTag) => {
    setActiveTag(prev => prev === tag ? null : tag);
  };

  const clearFilter = () => {
    setActiveTag(null);
  };

  const fogStyle = useMemo(() => ({
    '--fog-offset': `${fogOffsetRef.current}px`,
    '--parallax-offset': `${scrollYRef.current * 0.3}px`
  } as React.CSSProperties), [fogOffsetRef.current, scrollYRef.current]);

  return (
    <div className="poem-waterfall-container">
      <div className="ink-background" style={fogStyle}>
        <div className="mountain-layer mountain-back"></div>
        <div className="mountain-layer mountain-mid"></div>
        <div className="fog-layer fog-1"></div>
        <div className="fog-layer fog-2"></div>
        <div className="water-layer"></div>
      </div>

      {activeTag && (
        <div className="filter-bar">
          <span className="filter-label">当前筛选：</span>
          <span
            className="filter-tag"
            style={{ backgroundColor: TAG_COLORS[activeTag] }}
          >
            {activeTag}
          </span>
          <button className="clear-filter-btn" onClick={clearFilter}>
            清除筛选
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="cards-container"
      >
        {cards.map((card) => {
          const isFiltered = activeTag && card.poem.tag !== activeTag;
          return (
            <div
              key={card.id}
              className={`poem-card ${card.fallen ? 'fallen' : 'falling'} ${isFiltered ? 'filtered' : ''}`}
              style={{
                left: card.startX,
                width: cardWidth,
                transform: card.fallen
                  ? `translateY(${card.targetY}px rotate(${card.rotation}deg) translateZ(0)`
                  : `translateY(${card.startY}px rotate(${card.rotation}deg) translateZ(0)`,
                transitionDuration: `${card.duration / speedMultiplier}ms`,
                willChange: 'transform, opacity'
              }}
            >
              <div className="card-content">
                <div
                  className="tag-badge"
                  style={{ backgroundColor: TAG_COLORS[card.poem.tag] }}
                  onClick={() => handleTagClick(card.poem.tag)}
                  title={`点击筛选「${card.poem.tag}」类诗词`}
                >
                  {card.poem.tag}
                </div>

                <h2 className="poem-title">{card.poem.title}</h2>
                <p className="poem-author">{card.poem.author}</p>
                <div className="divider"></div>
                <div className="poem-content">
                  {card.poem.content.map((line, idx) => (
                    <p key={idx} className="poem-line">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .poem-waterfall-container {
          position: relative;
          width: 100%;
          min-height: 200vh;
          overflow: hidden;
        }

        .ink-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          z-index: 0;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            #A8D5BA 0%,
            #D7CCC8 50%,
            #8D6E63 100%
          );
        }

        .mountain-layer {
          position: absolute;
          width: 100%;
          height: 100%;
          transform: translateY(var(--parallax-offset, 0px));
          will-change: transform;
        }

        .mountain-back {
          top: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 80%, rgba(93, 64, 55, 0.4) 0%,
            radial-gradient(ellipse 60% 40% at 50% 90%, rgba(93, 64, 55, 0.3) 0%,
            radial-gradient(ellipse 70% 45% at 80% 85%, rgba(93, 64, 55, 0.35) 0%;
          background-size: 200% 100%;
          background-position: calc(50% + var(--fog-offset, 0px)) 50%;
          opacity: 0.6;
        }

        .mountain-mid {
          top: 10%;
          background:
            radial-gradient(ellipse 50% 40% at 15% 90%, rgba(62, 39, 35, 0.5) 0%,
            radial-gradient(ellipse 45% 35% at 60% 95%, rgba(62, 39, 35, 0.4) 0%,
            radial-gradient(ellipse 55% 38% at 90% 88%, rgba(62, 39, 35, 0.45) 0%;
          background-size: 200% 100%;
          background-position: calc(50% - var(--fog-offset, 0px)) 50%;
          opacity: 0.7;
        }

        .fog-layer {
          position: absolute;
          width: 200%;
          height: 100%;
          will-change: transform;
        }

        .fog-1 {
          top: 20%;
          background: radial-gradient(
            ellipse 50% 30% at 30% 50%,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 70%
          );
          animation: fogMove1 10s ease-in-out infinite;
          opacity: 0.5;
        }

        .fog-2 {
          top: 40%;
          background: radial-gradient(
            ellipse 60% 25% at 70% 60%,
            rgba(255, 255, 255, 0.25) 0%,
            transparent 70%
          );
          animation: fogMove2 12s ease-in-out infinite;
          opacity: 0.4;
        }

        @keyframes fogMove1 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-5px); }
        }

        @keyframes fogMove2 {
          0%, 100% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
        }

        .water-layer {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 30%;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(141, 110, 99, 0.3) 50%,
            rgba(46, 26, 17, 0.6) 100%
          );
        }

        .filter-bar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background: rgba(62, 39, 35, 0.9);
          border-radius: 8px;
          backdrop-filter: blur(8px);
        }

        .filter-label {
          color: #FAF0E6;
          font-size: 16px;
        }

        .filter-tag {
          padding: 4px 12px;
          border-radius: 999px;
          color: white;
          font-size: 14px;
        }

        .clear-filter-btn {
          padding: 6px 16px;
          background: #5D4037;
          color: #FAF0E6;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 14px;
          transition: background 0.3s ease-out;
        }

        .clear-filter-btn:hover {
          background: #4E342E;
        }

        .cards-container {
          position: relative;
          width: 100%;
          min-height: 200vh;
          padding: 80px 20px;
          z-index: 10;
        }

        .poem-card {
          position: absolute;
          top: 0;
          background: rgba(250, 240, 230, 0.85);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(46, 26, 17, 0.3);
          transition: transform 0.3s ease-out, opacity 0.4s ease-out, box-shadow 0.3s ease-out;
          cursor: pointer;
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .poem-card.falling {
          animation-timing-function: ease-out;
        }

        .poem-card:hover {
          transform: translateY(var(--fall-y, 0)) scale(1.08) rotate(var(--fall-rotation, 0deg)) translateZ(0) !important;
          box-shadow: 0 8px 40px rgba(46, 26, 17, 0.5) !important;
          z-index: 50;
        }

        .poem-card.filtered {
          opacity: 0.2;
          pointer-events: none;
        }

        .card-content {
          position: relative;
          padding: 24px 24px 28px;
        }

        .tag-badge {
          position: absolute;
          top: 12px;
          right: -6px;
          padding: 4px 10px;
          border-radius: 999px;
          color: white;
          font-size: 12px;
          cursor: pointer;
          transition: transform 0.2s ease-out;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .tag-badge:hover {
          transform: scale(1.1);
        }

        .poem-title {
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 24px;
          font-weight: bold;
          color: #5D4037;
          margin-bottom: 8px;
          padding-right: 50px;
        }

        .poem-author {
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 14px;
          color: #8B4513;
          margin-bottom: 8px;
        }

        .divider {
          width: 100%;
          height: 1px;
          background: #D7CCC8;
          margin: 8px 0;
        }

        .poem-content {
          margin-top: 8px;
        }

        .poem-line {
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 18px;
          color: #4A3728;
          line-height: 1.8;
        }

        @media (max-width: 768px) {
          .poem-title {
            font-size: 20px;
          }
          .poem-line {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .cards-container {
            padding: 100px 10px;
          }
          .poem-title {
            font-size: 18px;
          }
          .poem-author {
            font-size: 12px;
          }
          .poem-line {
            font-size: 14px;
          }
          .card-content {
            padding: 16px 16px 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default PoemFall;
