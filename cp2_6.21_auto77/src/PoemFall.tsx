import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { poems, EMOTION_COLORS, type EmotionTag, type Poem } from './PoemData';

interface CardState {
  uid: number;
  poem: Poem;
  baseX: number;
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
  swayAmplitude: number;
  swayFrequency: number;
  swayOffset: number;
}

interface NeighborInfo {
  prevUid: number | null;
  nextUid: number | null;
  prevDirection: number;
  nextDirection: number;
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

function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

const MAX_CARDS = 15;
const MIN_CARDS = 10;
const SETTLE_DURATION = 5000;
const FADE_DURATION = 1000;
const SWAY_MAX_AMPLITUDE = 3;

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

  const findNeighbors = useCallback((uid: number): NeighborInfo => {
    const sorted = [...cardsRef.current].sort((a, b) => a.currentY - b.currentY);
    const idx = sorted.findIndex(c => c.uid === uid);
    if (idx === -1) return { prevUid: null, nextUid: null, prevDirection: -1, nextDirection: 1 };

    const hovered = sorted[idx];
    let prevUid: number | null = null;
    let nextUid: number | null = null;
    let prevDirection = -1;
    let nextDirection = 1;

    if (idx > 0) {
      const prevCard = sorted[idx - 1];
      prevUid = prevCard.uid;
      prevDirection = prevCard.baseX < hovered.baseX ? -1 : 1;
    }
    if (idx < sorted.length - 1) {
      const nextCard = sorted[idx + 1];
      nextUid = nextCard.uid;
      nextDirection = nextCard.baseX < hovered.baseX ? -1 : 1;
    }

    return { prevUid, nextUid, prevDirection, nextDirection };
  }, []);

  const neighborInfo = useMemo((): NeighborInfo => {
    if (hoveredUid === null) return { prevUid: null, nextUid: null, prevDirection: -1, nextDirection: 1 };
    return findNeighbors(hoveredUid);
  }, [hoveredUid, findNeighbors]);

  const createCard = useCallback((): CardState => {
    const idx = nextIndexRef.current % shuffledPoems.length;
    nextIndexRef.current += 1;
    const poem = shuffledPoems[idx];
    const cardWidth = getCardWidth();
    const containerWidth = window.innerWidth;
    const centerX = containerWidth / 2 - cardWidth / 2;
    const baseX = centerX + (Math.random() * 160 - 80);
    const rotation = Math.random() * 10 - 5;
    const existingActive = cardsRef.current.filter(c => !c.fadingOut);
    const maxY = existingActive.length > 0
      ? Math.max(...existingActive.map(c => c.targetY)) + 60
      : 80;
    const targetY = maxY + Math.random() * 40;
    const baseDuration = 15000 + Math.random() * 10000;
    const duration = baseDuration / speedRef.current;
    const startY = -400;
    const swayAmplitude = 1.5 + Math.random() * (SWAY_MAX_AMPLITUDE - 1.5);
    const swayFrequency = 0.0008 + Math.random() * 0.0006;

    return {
      uid: nextUidRef.current++,
      poem,
      baseX,
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
      swayAmplitude,
      swayFrequency,
      swayOffset: 0,
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
      if (cardsRef.current.length < MIN_CARDS) {
        const toAdd = MIN_CARDS - cardsRef.current.length;
        for (let i = 0; i < toAdd; i++) {
          setTimeout(() => addCard(), i * 400);
        }
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
        const newCardsToAdd: CardState[] = [];

        for (const card of prev) {
          let updated = { ...card };

          if (card.fadingOut) {
            const fadeStart = (card.settledAt ?? 0) + SETTLE_DURATION;
            const fadeProgress = Math.min((time - fadeStart) / FADE_DURATION, 1);
            updated.opacity = 1 - fadeProgress;
            if (updated.opacity <= 0) {
              const replacement = createCard();
              newCardsToAdd.push(replacement);
              changed = true;
              continue;
            }
            changed = true;
          } else if (!card.settled) {
            const elapsed = time - card.startTime;
            const progress = Math.min(elapsed / card.duration, 1);
            const easedProgress = easeOutSine(progress);
            updated.currentY = card.startY + (card.targetY - card.startY) * easedProgress;
            updated.swayOffset = Math.sin(elapsed * card.swayFrequency) * card.swayAmplitude;

            if (progress >= 1) {
              updated.settled = true;
              updated.settledAt = time;
              updated.swayOffset = 0;
            }
            changed = true;
          } else if (card.settled && card.settledAt !== null && !card.fadingOut) {
            if (time - card.settledAt >= SETTLE_DURATION) {
              updated.fadingOut = true;
              changed = true;
            }
          }

          if (updated.uid === neighborInfo.prevUid) {
            updated.offsetX = 10 * neighborInfo.prevDirection;
            updated.forcedOpacity = 0.7;
            changed = true;
          } else if (updated.uid === neighborInfo.nextUid) {
            updated.offsetX = 10 * neighborInfo.nextDirection;
            updated.forcedOpacity = 0.7;
            changed = true;
          } else if (updated.offsetX !== 0 || updated.forcedOpacity !== null) {
            updated.offsetX = 0;
            updated.forcedOpacity = null;
            changed = true;
          }

          next.push(updated);
        }

        if (newCardsToAdd.length > 0) {
          next.push(...newCardsToAdd);
          changed = true;
        }

        return changed ? next : prev;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [neighborInfo, createCard]);

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
          const isNeighbor = card.uid === neighborInfo.prevUid || card.uid === neighborInfo.nextUid;

          const baseOpacity = card.forcedOpacity !== null ? card.forcedOpacity : card.opacity;
          const displayedOpacity = isFiltered ? Math.min(0.2, baseOpacity) : baseOpacity;

          const scale = isHovered ? 1.08 : 1.0;
          const totalOffsetX = card.swayOffset + card.offsetX;
          const boxShadow = isHovered
            ? '4px 8px 28px rgba(0,0,0,0.45)'
            : '2px 4px 16px rgba(0,0,0,0.25)';

          return (
            <div
              key={card.uid}
              className="poem-card"
              style={{
                position: 'absolute',
                left: card.baseX,
                top: card.currentY,
                width: cardWidth,
                opacity: displayedOpacity,
                transform: `translateX(${totalOffsetX}px) rotate(${card.rotation}deg) scale(${scale}) translateZ(0)`,
                willChange: 'transform, opacity',
                transition: 'transform 0.3s ease-out, opacity 0.4s ease-out',
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
