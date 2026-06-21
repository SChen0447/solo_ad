import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { poems, EMOTION_COLORS, type EmotionTag, type Poem } from './PoemData';

interface CardState {
  poem: Poem;
  x: number;
  targetY: number;
  currentY: number;
  rotation: number;
  settled: boolean;
  opacity: number;
}

function getCardWidth(): number {
  const w = window.innerWidth;
  if (w <= 480) return 200;
  if (w <= 768) return 260;
  return 320;
}

function getFallSpeed(): number {
  const w = window.innerWidth;
  return w <= 480 ? 1.5 : 1.0;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PoemFall: React.FC = () => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [activeTag, setActiveTag] = useState<EmotionTag | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const nextIndexRef = useRef(0);
  const cardsRef = useRef<CardState[]>([]);
  const shuffledPoems = useMemo(() => shuffleArray(poems), []);

  cardsRef.current = cards;

  const addCard = useCallback(() => {
    const idx = nextIndexRef.current % shuffledPoems.length;
    nextIndexRef.current += 1;
    const poem = shuffledPoems[idx];
    const cardWidth = getCardWidth();
    const containerWidth = window.innerWidth;
    const centerX = containerWidth / 2 - cardWidth / 2;
    const x = centerX + (Math.random() * 160 - 80);
    const rotation = Math.random() * 10 - 5;
    const existingSettled = cardsRef.current.filter(c => c.settled);
    const maxY = existingSettled.length > 0
      ? Math.max(...existingSettled.map(c => c.targetY)) + 60
      : 80;
    const targetY = maxY + Math.random() * 40;

    const newCard: CardState = {
      poem,
      x,
      targetY,
      currentY: -400,
      rotation,
      settled: false,
      opacity: 1,
    };

    setCards(prev => [...prev, newCard]);
  }, [shuffledPoems]);

  useEffect(() => {
    const initialCount = 5;
    for (let i = 0; i < initialCount; i++) {
      setTimeout(() => addCard(), i * 600);
    }
    const interval = setInterval(() => {
      if (cardsRef.current.length < 30) {
        addCard();
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [addCard]);

  useEffect(() => {
    const speed = getFallSpeed();
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 16.67;
      lastTime = time;

      setCards(prev => {
        let changed = false;
        const next = prev.map(card => {
          if (card.settled) return card;
          const step = 1.2 * speed * delta;
          const newY = card.currentY + step;
          if (newY >= card.targetY) {
            changed = true;
            return { ...card, currentY: card.targetY, settled: true };
          }
          changed = true;
          return { ...card, currentY: newY };
        });
        return changed ? next : prev;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleTagClick = useCallback((tag: EmotionTag) => {
    setActiveTag(prev => (prev === tag ? null : tag));
  }, []);

  const backgroundStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '120%',
    background: `
      linear-gradient(180deg, #A8D5BA 0%, #D7CCC8 50%, #8D6E63 100%),
      radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 40%, rgba(255,255,255,0.12) 0%, transparent 50%)
    `,
    transform: `translateY(${scrollY * -0.3}px)`,
    zIndex: 0,
    pointerEvents: 'none',
    animation: 'inkDrift 10s ease-in-out infinite',
  };

  return (
    <>
      <style>{`
        @keyframes inkDrift {
          0%, 100% { margin-left: -5px; }
          50% { margin-left: 5px; }
        }
      `}</style>
      <div style={backgroundStyle} />
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          zIndex: 1,
          paddingBottom: 200,
        }}
      >
        {cards.map((card, idx) => {
          const isFiltered = activeTag !== null && card.poem.tag !== activeTag;
          const tagColor = EMOTION_COLORS[card.poem.tag];
          const cardWidth = getCardWidth();

          return (
            <div
              key={`${card.poem.id}-${idx}`}
              className="poem-card"
              style={{
                position: 'absolute',
                left: card.x,
                top: card.currentY,
                width: cardWidth,
                opacity: isFiltered ? 0.2 : card.opacity,
                transform: `rotate(${card.rotation}deg) translateZ(0)`,
                willChange: 'transform, opacity',
                transition: 'opacity 0.4s ease-out, transform 0.3s ease-out',
                background: 'rgba(250, 240, 230, 0.85)',
                borderRadius: 6,
                padding: '20px 24px',
                boxShadow: '2px 4px 16px rgba(0,0,0,0.25)',
                fontFamily: "'KaiTi', 'STKaiti', serif",
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = `rotate(${card.rotation}deg) scale(1.08) translateZ(0)`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 8px 28px rgba(0,0,0,0.45)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = `rotate(${card.rotation}deg) scale(1) translateZ(0)`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 4px 16px rgba(0,0,0,0.25)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: tagColor,
                  color: '#fff',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: "'KaiTi', 'STKaiti', serif",
                  lineHeight: 1,
                  fontWeight: 700,
                }}
                onClick={e => {
                  e.stopPropagation();
                  handleTagClick(card.poem.tag);
                }}
                title={card.poem.tag}
              >
                {card.poem.tag.charAt(0)}
              </div>

              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#5D4037',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {card.poem.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: '#8B4513',
                  margin: '4px 0 0 0',
                  lineHeight: 1.4,
                }}
              >
                {card.poem.author}
              </p>

              <div
                style={{
                  width: '100%',
                  height: 1,
                  background: '#D7CCC8',
                  margin: '8px 0',
                }}
              />

              <div>
                {card.poem.content.map((line, li) => (
                  <p
                    key={li}
                    style={{
                      fontSize: 18,
                      color: '#4A3728',
                      margin: 0,
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {activeTag && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'rgba(62, 39, 35, 0.9)',
            color: '#FAF0E6',
            padding: '8px 20px',
            borderRadius: 20,
            fontFamily: "'KaiTi', 'STKaiti', serif",
            fontSize: 14,
            cursor: 'pointer',
            transition: 'opacity 0.4s ease-out',
          }}
          onClick={() => setActiveTag(null)}
        >
          筛选：{activeTag} — 点击清除
        </div>
      )}
    </>
  );
};

export default PoemFall;
