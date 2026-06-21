import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { poems, EMOTION_COLORS, type EmotionTag, type Poem } from './PoemData';

interface CardState {
  uid: number;
  poem: Poem;
  x: number;
  startY: number;
  targetY: number;
  currentY: number;
  rotation: number;
  startTime: number;
  duration: number;
  settled: boolean;
  settledAt: number | null;
  fadingOut: boolean;
  opacity: number;
  offsetX: number;
  forcedOpacity: number | null;
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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const MAX_CARDS = 15;
const MIN_CARDS = 10;
const SETTLE_DURATION = 5000;
const FADE_DURATION = 1000;

const PoemFall: React.FC = () => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [activeTag, setActiveTag] = useState<EmotionTag | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [hoveredUid, setHoveredUid] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const nextIndexRef = useRef(0);
  const nextUidRef = useRef(1);
  const cardsRef = useRef<CardState[]>([]);
  const speedRef = useRef(getFallSpeed());
  const shuffledPoems = useMemo(() => shuffleArray(poems), []);

  cardsRef.current = cards;

  const findNeighbors = useCallback((uid: number): { prevUid: number | null; nextUid: number | null } => {
    const settledCards = cardsRef.current
      .filter(c => c.settled)
      .sort((a, b) => a.targetY - b.targetY);
    const idx = settledCards.findIndex(c => c.uid === uid);
    if (idx === -1) return { prevUid: null, nextUid: null };
    return {
      prevUid: idx > 0 ? settledCards[idx - 1].uid : null,
      nextUid: idx < settledCards.length - 1 ? settledCards[idx + 1].uid : null,
    };
  }, []);

  const { prevUid, nextUid } = useMemo(() => {
    if (hoveredUid === null) return { prevUid: null, nextUid: null };
    return findNeighbors(hoveredUid);
  }, [hoveredUid, findNeighbors]);

  const createCard = useCallback((): CardState => {
    const idx = nextIndexRef.current % shuffledPoems.length;
    nextIndexRef.current += 1;
    const poem = shuffledPoems[idx];
    const cardWidth = getCardWidth();
    const containerWidth = window.innerWidth;
    const centerX = containerWidth / 2 - cardWidth / 2;
    const x = centerX + (Math.random() * 160 - 80);
    const rotation = Math.random() * 10 - 5;
    const existingSettled = cardsRef.current.filter(c => c.settled && !c.fadingOut);
    const maxY = existingSettled.length > 0
      ? Math.max(...existingSettled.map(c => c.targetY)) + 60
      : 80;
    const targetY = maxY + Math.random() * 40;
    const baseDuration = 15000 + Math.random() * 10000;
    const duration = baseDuration / speedRef.current;
    const startY = -400;

    return {
      uid: nextUidRef.current++,
      poem,
      x,
      startY,
      targetY,
      currentY: startY,
      rotation,
      startTime: performance.now(),
      duration,
      settled: false,
      settledAt: null,
      fadingOut: false,
      opacity: 1,
      offsetX: 0,
      forcedOpacity: null,
    };
  }, [shuffledPoems]);

  const addCard = useCallback(() => {
    if (cardsRef.current.length >= MAX_CARDS) return;
    const newCard = createCard();
    setCards(prev => [...prev, newCard]);
  }, [createCard]);

  useEffect(() => {
    const initialCount = 5;
    for (let i = 0; i < initialCount; i++) {
      setTimeout(() => {
        const card = createCard();
        setCards(prev => [...prev, card]);
      }, i * 600);
    }
  }, [createCard]);

  useEffect(() => {
    const interval = setInterval(() => {
      const total = cardsRef.current.length;
      if (total < MIN_CARDS) {
        const toAdd = Math.min(2, MIN_CARDS - total);
        for (let i = 0; i < toAdd; i++) {
          setTimeout(() => addCard(), i * 400);
        }
      } else if (total < MAX_CARDS && Math.random() > 0.5) {
        addCard();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [addCard]);

  useEffect(() => {
    const onResize = () => {
      speedRef.current = getFallSpeed();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const animate = (time: number) => {
      setCards(prev => {
        let changed = false;
        const next: CardState[] = [];
        let removedCount = 0;

        for (const card of prev) {
          let updated = { ...card };

          if (card.fadingOut) {
            const fadeStart = (card.settledAt ?? 0) + SETTLE_DURATION;
            const fadeProgress = Math.min((time - fadeStart) / FADE_DURATION, 1);
            updated.opacity = 1 - fadeProgress;
            if (updated.opacity <= 0) {
              removedCount++;
              changed = true;
              continue;
            }
            changed = true;
          } else if (!card.settled) {
            const elapsed = time - card.startTime;
            const progress = Math.min(elapsed / card.duration, 1);
            const easedProgress = easeOutCubic(progress);
            updated.currentY = card.startY + (card.targetY - card.startY) * easedProgress;

            if (progress >= 1) {
              updated.settled = true;
              updated.settledAt = time;
            }
            changed = true;
          } else if (card.settled && card.settledAt !== null && !card.fadingOut) {
            if (time - card.settledAt >= SETTLE_DURATION) {
              updated.fadingOut = true;
              changed = true;
            }
          }

          if (updated.uid === prevUid || updated.uid === nextUid) {
            updated.offsetX = updated.uid === prevUid ? -10 : 10;
            updated.forcedOpacity = 0.7;
            changed = true;
          } else if (updated.offsetX !== 0 || updated.forcedOpacity !== null) {
            updated.offsetX = 0;
            updated.forcedOpacity = null;
            changed = true;
          }

          next.push(updated);
        }

        if (removedCount > 0) {
          for (let i = 0; i < removedCount; i++) {
            setTimeout(() => addCard(), i * 600 + Math.random() * 300);
          }
        }

        return changed ? next : prev;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [prevUid, nextUid, addCard]);

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
        {cards.map(card => {
          const isFiltered = activeTag !== null && card.poem.tag !== activeTag;
          const tagColor = EMOTION_COLORS[card.poem.tag];
          const cardWidth = getCardWidth();
          const isHovered = hoveredUid === card.uid;
          const isNeighbor = card.uid === prevUid || card.uid === nextUid;

          const baseOpacity = card.forcedOpacity !== null ? card.forcedOpacity : card.opacity;
          const displayedOpacity = isFiltered ? Math.min(0.2, baseOpacity) : baseOpacity;

          const scale = isHovered ? 1.08 : 1.0;
          const offsetX = card.offsetX;
          const boxShadow = isHovered
            ? '4px 8px 28px rgba(0,0,0,0.45)'
            : '2px 4px 16px rgba(0,0,0,0.25)';

          return (
            <div
              key={card.uid}
              className="poem-card"
              style={{
                position: 'absolute',
                left: card.x + offsetX,
                top: card.currentY,
                width: cardWidth,
                opacity: displayedOpacity,
                transform: `rotate(${card.rotation}deg) scale(${scale}) translateZ(0)`,
                willChange: 'transform, opacity, left',
                transition: 'transform 0.3s ease-out, left 0.3s ease-out, opacity 0.4s ease-out',
                background: 'rgba(250, 240, 230, 0.85)',
                borderRadius: 6,
                padding: '20px 24px',
                boxShadow,
                fontFamily: "'KaiTi', 'STKaiti', serif",
                cursor: 'pointer',
                zIndex: isHovered ? 10 : (isNeighbor ? 5 : 1),
              }}
              onMouseEnter={() => setHoveredUid(card.uid)}
              onMouseLeave={() => setHoveredUid(null)}
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
