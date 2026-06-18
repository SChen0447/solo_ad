import React, { useRef } from 'react';
import { Card, CATEGORY_COLORS } from './types';
import './CardList.css';

interface CardListProps {
  cards: Card[];
  favorites: Card[];
  favoriteIds: string[];
  onCardClick: (cardId: string) => void;
  onToggleFavorite: (cardId: string) => void;
}

const CardList: React.FC<CardListProps> = ({
  cards,
  favorites,
  favoriteIds,
  onCardClick,
  onToggleFavorite
}) => {
  const cardsRef = useRef<HTMLDivElement>(null);

  const scrollToCard = (cardId: string) => {
    const cardEl = document.getElementById(`card-${cardId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.style.transition = 'box-shadow 0.3s';
      cardEl.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
      setTimeout(() => {
        cardEl.style.boxShadow = '';
      }, 1000);
    }
  };

  const renderStars = (difficulty: number) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={star <= difficulty ? '#f59e0b' : 'none'}
            stroke={star <= difficulty ? '#f59e0b' : '#d1d5db'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? '#ef4444' : 'none'}
      stroke={filled ? '#ef4444' : '#9ca3af'}
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );

  return (
    <div className="card-list-container">
      {favorites.length > 0 && (
        <div className="favorites-bar">
          <div className="favorites-header">
            <span className="favorites-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              我的收藏 ({favorites.length})
            </span>
          </div>
          <div className="favorites-scroll">
            {favorites.map((card) => (
              <div
                key={card.id}
                className="favorite-thumb"
                onClick={() => scrollToCard(card.id)}
                title={card.title}
              >
                <div
                  className="thumb-category-dot"
                  style={{ backgroundColor: CATEGORY_COLORS[card.category] || '#6b7280' }}
                />
                <span className="thumb-title">{card.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cards-grid" ref={cardsRef}>
        {cards.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p>暂无卡片，点击左侧"新建卡片"开始创建</p>
          </div>
        ) : (
          cards.map((card, index) => (
            <div
              key={card.id}
              id={`card-${card.id}`}
              className="card"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => onCardClick(card.id)}
            >
              <button
                className="favorite-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(card.id);
                }}
              >
                <HeartIcon filled={favoriteIds.includes(card.id)} />
              </button>

              <div className="card-category" style={{ backgroundColor: CATEGORY_COLORS[card.category] || '#6b7280' }}>
                {card.category}
              </div>

              <h3 className="card-title">{card.title}</h3>

              <div className="card-preview">
                {card.content.replace(/[#*`\n]/g, ' ').slice(0, 80)}...
              </div>

              {renderStars(card.difficulty)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CardList;
