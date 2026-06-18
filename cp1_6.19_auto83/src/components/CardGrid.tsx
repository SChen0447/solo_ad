import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CardData, ELEMENT_LABELS, useAppStore } from '../stores/cardStore';

interface CardTileProps {
  card: CardData;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  draggable?: boolean;
  isDragging?: boolean;
  className?: string;
}

const CardTile: React.FC<CardTileProps> = ({
  card,
  onClick,
  onDragStart,
  onDragEnd,
  draggable = false,
  isDragging = false,
  className = '',
}) => {
  const stars = '★'.repeat(card.stars);

  return (
    <div
      className={`card-tile rarity-${card.rarity} element-${card.element} ${
        isDragging ? 'dragging-card' : ''
      } ${className}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="card-header">
        <span className="card-name">{card.name}</span>
        <span className="card-stars">{stars}</span>
      </div>
      <div className="card-artwork">{card.icon}</div>
      <div className="card-footer">
        <span className="card-element">{ELEMENT_LABELS[card.element]}</span>
        <span className="card-power">⚔{card.basePower}</span>
      </div>
    </div>
  );
};

interface CardGridProps {
  filter?: { element?: string; rarity?: string };
}

const CardGrid: React.FC<CardGridProps> = ({ filter }) => {
  const { allCards, collectedCardIds, addToDeck } = useAppStore();
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isModalFading, setIsModalFading] = useState(false);
  const [flashWarning, setFlashWarning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const collectedCards = allCards.filter((c) => collectedCardIds.includes(c.id));

  const filteredCards = collectedCards.filter((c) => {
    if (filter?.element && filter.element !== 'all' && c.element !== filter.element) return false;
    if (filter?.rarity && filter.rarity !== 'all' && c.rarity !== filter.rarity) return false;
    return true;
  });

  const displayedCards = filteredCards.slice(0, visibleCount);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredCards.length) {
          setVisibleCount((v) => Math.min(v + 8, filteredCards.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current && observerRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [filteredCards.length, visibleCount]);

  useEffect(() => {
    setVisibleCount(12);
  }, [filter]);

  const handleCardClick = useCallback((card: CardData) => {
    setSelectedCard(card);
    setIsModalFading(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalFading(true);
    setTimeout(() => {
      setSelectedCard(null);
      setIsModalFading(false);
    }, 300);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, card: CardData) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;
    const card = allCards.find((c) => c.id === cardId);
    if (!card) return;
    const success = addToDeck(card);
    if (!success) {
      setFlashWarning(true);
      setTimeout(() => setFlashWarning(false), 1000);
    }
  }, [allCards, addToDeck]);

  return (
    <div className="page-slide-in" style={{ padding: '20px 24px' }}>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <h2 style={{ fontSize: '22px', marginRight: 'auto' }}>📖 幻灵图鉴</h2>
        <span style={{ opacity: 0.8, fontSize: '14px' }}>
          已收集: {collectedCards.length} / {allCards.length}
        </span>
        {flashWarning && (
          <span style={{ color: '#ff5252', fontSize: '14px', animation: 'flashRed 0.5s ease 2' }}>
            卡组已满！
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '20px',
          justifyItems: 'center',
        }}
      >
        {displayedCards.map((card, idx) => (
          <CardTile
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card)}
            draggable
            onDragStart={(e) => handleDragStart(e, card)}
            onDragEnd={handleDragEnd}
            className={idx === displayedCards.length - 1 ? '' : ''}
          />
        ))}
      </div>

      <div ref={loadMoreRef} style={{ height: '1px' }} />

      {selectedCard && (
        <div
          className={`modal-overlay ${isModalFading ? 'fade-out' : ''}`}
          onClick={handleCloseModal}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button className="modal-close" onClick={handleCloseModal}>
              ×
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <CardTile card={selectedCard} />
              <div>
                <h2>{selectedCard.name}</h2>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  <div>属性: {ELEMENT_LABELS[selectedCard.element]}</div>
                  <div>
                    稀有度:{' '}
                    <span style={{ color: selectedCard.rarity === 'common' ? '#9e9e9e' :
                      selectedCard.rarity === 'rare' ? '#42a5f5' :
                      selectedCard.rarity === 'epic' ? '#ab47bc' : '#ffa726' }}>
                      {selectedCard.rarity === 'common' ? '普通' :
                        selectedCard.rarity === 'rare' ? '稀有' :
                        selectedCard.rarity === 'epic' ? '史诗' : '传说'}
                    </span>
                  </div>
                  <div>基础战力: {selectedCard.basePower}</div>
                  <div>星级: {'★'.repeat(selectedCard.stars)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px', color: '#d4a14b' }}>技能</h3>
              <p>
                <strong>{selectedCard.skill.name}</strong>: {selectedCard.skill.description}
              </p>
            </div>

            {selectedCard.evolution && selectedCard.evolution.length > 0 && (
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '8px', color: '#d4a14b' }}>进化路线</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedCard.evolution.map((e, i) => (
                    <React.Fragment key={i}>
                      <span
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(212,161,75,0.15)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      >
                        {e}
                      </span>
                      {i < selectedCard.evolution!.length - 1 && <span>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardGrid;
