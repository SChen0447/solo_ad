import React, { useState, useEffect, useRef, useCallback } from 'react';
import PoemCard from '../components/PoemCard';
import { getRandomPoems, searchPoems, filterByDynasty } from '../poemData';
import { randomInRange, getCardEstimatedHeight, throttle } from '../utils';
import type { CardState, Poem } from '../types';

interface WaterfallFlowProps {
  searchQuery: string;
  selectedDynasty: string;
  filterTrigger: number;
  onAnyCardClick: () => void;
}

const WaterfallFlow: React.FC<WaterfallFlowProps> = ({
  searchQuery,
  selectedDynasty,
  filterTrigger,
  onAnyCardClick
}) => {
  const [cardStates, setCardStates] = useState<CardState[]>([]);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showEmptyTip, setShowEmptyTip] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastLoadRef = useRef<number>(0);
  const loadedIdsRef = useRef<string[]>([]);
  const usedPoemsRef = useRef<string[]>([]);
  const scrollTriggeredRef = useRef(false);

  const CARD_WIDTH = 320;
  const VERTICAL_GAP = 60;
  const CARDS_PER_BATCH = 10;
  const UPDATE_INTERVAL = 30;

  const getColumnCount = useCallback((): number => {
    const width = containerRef.current?.clientWidth || window.innerWidth;
    if (width < 768) return 1;
    if (width < 1100) return 2;
    if (width < 1500) return 3;
    return 4;
  }, []);

  const getContainerPadding = useCallback((): number => {
    return 30;
  }, []);

  const createCardState = useCallback((poem: Poem, baseY: number, columnIndex: number, columnCount: number, containerWidth: number): CardState => {
    const padding = getContainerPadding();
    const usableWidth = containerWidth - padding * 2;
    const columnWidth = usableWidth / columnCount;
    const centerX = padding + columnWidth * columnIndex + columnWidth / 2;
    const xOffset = randomInRange(-80, 80);
    const finalX = centerX + xOffset - CARD_WIDTH / 2;
    const estimatedHeight = getCardEstimatedHeight(poem.content.length);
    const targetY = baseY + estimatedHeight / 2;
    const startY = -estimatedHeight - randomInRange(50, 300);

    return {
      poem,
      position: {
        x: finalX,
        y: startY,
        rotation: randomInRange(-5, 5),
        targetY: targetY,
        settled: false
      },
      opacity: 0,
      isExpanded: false,
      speed: randomInRange(1.5, 3.5)
    };
  }, [getContainerPadding]);

  const loadCards = useCallback((initialLoad: boolean = false) => {
    const now = Date.now();
    if (!initialLoad && now - lastLoadRef.current < 500) return;
    lastLoadRef.current = now;

    let poemsToLoad: Poem[];
    
    if (searchQuery.trim() || selectedDynasty) {
      const results = searchPoems(searchQuery, selectedDynasty);
      const newResults = results.filter(p => !usedPoemsRef.current.includes(p.id));
      
      if (newResults.length === 0) {
        if (initialLoad && results.length === 0) {
          setShowEmptyTip(true);
        }
        return;
      }
      
      poemsToLoad = newResults.slice(0, initialLoad ? Math.min(CARDS_PER_BATCH * 2, newResults.length) : CARDS_PER_BATCH);
    } else {
      poemsToLoad = getRandomPoems(initialLoad ? CARDS_PER_BATCH * 2 : CARDS_PER_BATCH, usedPoemsRef.current);
    }

    if (poemsToLoad.length === 0) return;

    poemsToLoad.forEach(p => usedPoemsRef.current.push(p.id));

    setCardStates(prev => {
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth - 60;
      const columnCount = getColumnCount();
      const columnHeights: number[] = new Array(columnCount).fill(0);
      
      prev.forEach(card => {
        const h = getCardEstimatedHeight(card.poem.content.length) + VERTICAL_GAP;
        const col = Math.min(
          columnCount - 1,
          Math.floor(((card.position.x + CARD_WIDTH / 2 - getContainerPadding()) / (containerWidth - getContainerPadding() * 2)) * columnCount)
        );
        columnHeights[Math.max(0, Math.min(columnCount - 1, col))] = Math.max(
          columnHeights[Math.max(0, Math.min(columnCount - 1, col))],
          card.position.targetY + h / 2
        );
      });

      const minHeight = Math.min(...columnHeights);
      const baseY = Math.max(minHeight, initialLoad ? 50 : minHeight);

      const newCards: CardState[] = poemsToLoad.map((poem, idx) => {
        const colIdx = columnHeights.indexOf(Math.min(...columnHeights));
        const card = createCardState(poem, baseY + idx * 100, colIdx, columnCount, containerWidth);
        const h = getCardEstimatedHeight(poem.content.length) + VERTICAL_GAP;
        columnHeights[colIdx] = card.position.targetY + h / 2;
        return card;
      });

      return [...prev, ...newCards];
    });
  }, [searchQuery, selectedDynasty, createCardState, getColumnCount, getContainerPadding]);

  const reloadAll = useCallback(() => {
    setIsFadingOut(true);
    setShowEmptyTip(false);
    setExpandedId(null);

    setTimeout(() => {
      setCardStates([]);
      loadedIdsRef.current = [];
      usedPoemsRef.current = [];
      scrollTriggeredRef.current = false;
      
      setTimeout(() => {
        setIsFadingOut(false);
        loadCards(true);
      }, 100);
    }, 300);
  }, [loadCards]);

  useEffect(() => {
    reloadAll();
  }, [filterTrigger]);

  useEffect(() => {
    loadCards(true);
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= UPDATE_INTERVAL) {
        lastTime = currentTime;
        const delta = deltaTime / 16.67;

        setCardStates(prev => {
          let hasChanges = false;
          const updated = prev.map(card => {
            if (card.position.settled) return card;
            
            const newY = card.position.y + card.speed * delta;
            let settled = card.position.settled;
            let finalY = newY;
            let finalOpacity = card.opacity;

            if (newY >= card.position.targetY) {
              finalY = card.position.targetY;
              settled = true;
            }

            const distance = Math.abs(finalY - card.position.targetY);
            if (distance < 500 && !settled) {
              finalOpacity = Math.min(1, finalOpacity + 0.02 * delta);
            } else if (settled) {
              finalOpacity = 1;
            }

            if (finalY !== card.position.y || settled !== card.position.settled || finalOpacity !== card.opacity) {
              hasChanges = true;
              return {
                ...card,
                position: { ...card.position, y: finalY, settled },
                opacity: finalOpacity
              };
            }
            return card;
          });

          return hasChanges ? updated : prev;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollTriggeredRef.current) return;
    
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= fullHeight - 400) {
      scrollTriggeredRef.current = true;
      loadCards(false);
      setTimeout(() => { scrollTriggeredRef.current = false; }, 1000);
    }
  }, [loadCards]);

  useEffect(() => {
    const throttledScroll = throttle(handleScroll, 200);
    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedId) {
        setExpandedId(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [expandedId]);

  const containerOpacity = isFadingOut ? 0 : 1;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        padding: `${getContainerPadding()}px ${getContainerPadding()}px ${getContainerPadding() * 3}px ${getContainerPadding()}px`,
        boxSizing: 'border-box',
        transition: `opacity 0.3s ease-out`,
        opacity: containerOpacity
      }}
    >
      {cardStates.map(card => (
        <PoemCard
          key={card.poem.id}
          poem={card.poem}
          x={card.position.x}
          y={card.position.y}
          rotation={card.position.rotation}
          opacity={card.opacity}
          isExpanded={expandedId === card.poem.id}
          onToggleExpand={handleToggleExpand}
          onCardClick={onAnyCardClick}
        />
      ))}
      
      {expandedId && (
        <div
          onClick={() => setExpandedId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 37, 47, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            animation: 'fadeIn 0.3s ease-out'
          }}
        />
      )}

      {showEmptyTip && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 20,
            color: '#A0A0A0',
            fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
            letterSpacing: 2,
            animation: 'fadeInSlow 0.5s ease-out',
            pointerEvents: 'none',
            padding: '0 20px'
          }}
        >
          烟雨朦胧，未寻得此朝佳句
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="320px"] {
            width: calc(100% - 20px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WaterfallFlow;
