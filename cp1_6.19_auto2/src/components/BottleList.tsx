import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Card } from '../types';

const CARD_HEIGHT = 100;
const CONTAINER_PADDING = 12;

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function useDebounce<T>(value: T, delay: number = 16): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef(0);

  useEffect(() => {
    if (value !== prevValue.current) {
      setAnimating(true);
      const start = prevValue.current;
      const end = value;
      const duration = 300;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * easeOut);
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setAnimating(false);
          prevValue.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  return (
    <span
      className={`count-number ${animating ? 'bounce' : ''}`}
      style={{ color }}
    >
      {displayValue}
    </span>
  );
}

const BottleCard = React.memo(function BottleCard({
  card,
  isSelected,
  onClick
}: {
  card: Card;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const titleOverflow = card.title.length > 25;
  const displayTitle = titleOverflow
    ? card.title.substring(0, 22) + '...'
    : card.title;

  return (
    <div
      className={`bottle-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => titleOverflow && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="card-emoji">{card.emoji}</div>
      <div className="card-content">
        <div className="card-title-container">
          <span className="card-title">{displayTitle}</span>
          {showTooltip && <div className="tooltip">{card.title}</div>}
        </div>
        <div className="card-time">{formatRelativeTime(card.createdAt)}</div>
        <div className="card-counts">
          <span className="count-item">
            👍 <AnimatedNumber value={card.likes} color="#3b82f6" />
          </span>
          <span className="count-item">
            👎 <AnimatedNumber value={card.dislikes} color="#6b7280" />
          </span>
        </div>
      </div>
    </div>
  );
});

export default function BottleList() {
  const { cards, selectedCardId, selectCard } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const debouncedScrollTop = useDebounce(scrollTop, 16);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => b.createdAt - a.createdAt);
  }, [cards]);

  const startIndex = Math.max(
    0,
    Math.floor((debouncedScrollTop - CONTAINER_PADDING) / CARD_HEIGHT)
  );

  const visibleCount = Math.ceil(containerHeight / CARD_HEIGHT) + 2;
  const endIndex = Math.min(sortedCards.length, startIndex + visibleCount);

  const visibleCards = useMemo(() => {
    return sortedCards.slice(startIndex, endIndex);
  }, [sortedCards, startIndex, endIndex]);

  const totalHeight = sortedCards.length * CARD_HEIGHT + CONTAINER_PADDING * 2;

  const handleCardClick = useCallback(
    (id: string) => {
      selectCard(id);
    },
    [selectCard]
  );

  return (
    <div className="bottle-list-container">
      <div className="list-header">
        <h3>漂流瓶海</h3>
        <span className="card-count">{sortedCards.length} 个灵感</span>
      </div>
      <div
        ref={containerRef}
        className="bottle-list-scroll"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleCards.map((card, index) => (
            <div
              key={card.id}
              style={{
                position: 'absolute',
                top: (startIndex + index) * CARD_HEIGHT + CONTAINER_PADDING,
                left: CONTAINER_PADDING,
                right: CONTAINER_PADDING,
                height: CARD_HEIGHT - 8
              }}
            >
              <BottleCard
                card={card}
                isSelected={selectedCardId === card.id}
                onClick={() => handleCardClick(card.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
