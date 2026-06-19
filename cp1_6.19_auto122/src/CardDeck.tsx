import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Illustration } from './types';

interface CardProps {
  card: Illustration;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, card: Illustration) => void;
  isDragging: boolean;
  isActive: boolean;
}

const Card: React.FC<CardProps> = React.memo(({ card, onDragStart, isDragging, isActive }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    onDragStart(e, card);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    onDragStart(e, card);
  };

  return (
    <div
      className={`illustration-card ${isDragging ? 'dragging' : ''} ${isActive ? 'active' : 'inactive'}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ background: card.imageUrl }}
    >
      <div className="card-title">{card.title}</div>
    </div>
  );
});

Card.displayName = 'Card';

interface CardDeckProps {
  cards: Illustration[];
  currentIndex: number;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, card: Illustration) => void;
  draggedCardId: string | null;
}

const CardDeck: React.FC<CardDeckProps> = ({ cards, currentIndex, onDragStart, draggedCardId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleStart, setVisibleStart] = useState(0);
  const VISIBLE_COUNT = 6;
  const CARD_HEIGHT = 100;
  const CARD_GAP = 12;

  const getVisibleRange = useCallback(() => {
    const start = Math.max(0, Math.min(currentIndex, cards.length - VISIBLE_COUNT));
    setVisibleStart(start);
  }, [currentIndex, cards.length]);

  useEffect(() => {
    getVisibleRange();
  }, [getVisibleRange]);

  const visibleCards = cards.slice(visibleStart, visibleStart + VISIBLE_COUNT);

  return (
    <div className="card-deck-container">
      <div className="deck-header">
        <h3>卡牌区</h3>
        <span className="deck-progress">
          {Math.min(currentIndex + 1, cards.length)} / {cards.length}
        </span>
      </div>
      <div
        className="card-deck"
        ref={containerRef}
        style={{ height: VISIBLE_COUNT * (CARD_HEIGHT + CARD_GAP) - CARD_GAP }}
      >
        {visibleCards.map((card, idx) => {
          const actualIndex = visibleStart + idx;
          const isActive = actualIndex === currentIndex;
          return (
            <div
              key={card.id}
              className="card-wrapper"
              style={{
                transform: `translateY(${idx * (CARD_HEIGHT + CARD_GAP)}px)`,
                opacity: isActive ? 1 : 0.4,
              }}
            >
              <Card
                card={card}
                onDragStart={onDragStart}
                isDragging={draggedCardId === card.id}
                isActive={isActive}
              />
            </div>
          );
        })}
      </div>
      <div className="deck-hint">
        拖拽当前卡牌到右侧对应风格区域
      </div>
    </div>
  );
};

export default CardDeck;
