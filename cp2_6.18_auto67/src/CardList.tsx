import React, { useRef } from 'react';
import { Card, CATEGORY_COLORS } from './types';

interface CardListProps {
  cards: Card[];
  favorites: Card[];
  onCardClick: (cardId: string) => void;
  onFavoriteToggle: (cardId: string, isFavorite: boolean) => void;
  onFavoriteCardClick: (cardId: string) => void;
  isLoading?: boolean;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`star ${star <= rating ? 'filled' : ''}`}
          viewBox="0 0 24 24"
          fill={star <= rating ? '#f59e0b' : 'none'}
          stroke={star <= rating ? '#f59e0b' : '#d1d5db'}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
};

const HeartIcon: React.FC<{ filled: boolean; onClick?: (e: React.MouseEvent) => void }> = ({
  filled,
  onClick
}) => (
  <svg
    className={`heart-icon ${filled ? 'filled' : ''}`}
    viewBox="0 0 24 24"
    fill={filled ? '#ef4444' : 'none'}
    stroke={filled ? '#ef4444' : 'currentColor'}
    strokeWidth="2"
    onClick={onClick}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CardList: React.FC<CardListProps> = ({
  cards,
  favorites,
  onCardClick,
  onFavoriteToggle,
  onFavoriteCardClick,
  isLoading = false
}) => {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToCard = (cardId: string) => {
    const cardEl = cardRefs.current.get(cardId);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.add('highlight');
      setTimeout(() => cardEl.classList.remove('highlight'), 2000);
    }
  };

  const handleFavoriteCardClick = (cardId: string) => {
    onFavoriteCardClick(cardId);
    setTimeout(() => scrollToCard(cardId), 100);
  };

  const isFavorite = (cardId: string) => {
    return favorites.some((f) => f.id === cardId);
  };

  const handleFavoriteClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    const fav = isFavorite(cardId);
    onFavoriteToggle(cardId, fav);
  };

  const getCardExcerpt = (content: string) => {
    const plainText = content.replace(/[#*`\[\]]/g, '').replace(/\n/g, ' ');
    return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
  };

  return (
    <div className="card-list-container">
      {favorites.length > 0 && (
        <div className="favorites-bar">
          <div className="favorites-header">
            <svg className="fav-star" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="favorites-title">收藏卡片</span>
            <span className="favorites-count">({favorites.length})</span>
          </div>
          <div className="favorites-scroll">
            {favorites.map((card) => (
              <div
                key={card.id}
                className="favorite-thumb"
                onClick={() => handleFavoriteCardClick(card.id)}
                style={{ borderLeftColor: CATEGORY_COLORS[card.category] || '#9ca3af' }}
              >
                <div className="thumb-title">{card.title}</div>
                <div
                  className="thumb-category"
                  style={{ backgroundColor: CATEGORY_COLORS[card.category] || '#9ca3af' }}
                >
                  {card.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-skeleton">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <p className="empty-text">暂无卡片</p>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map((card, index) => (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el);
              }}
              className="card-item"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => onCardClick(card.id)}
            >
              <div className="card-header">
                <span
                  className="category-tag"
                  style={{ backgroundColor: CATEGORY_COLORS[card.category] || '#9ca3af' }}
                >
                  {card.category}
                </span>
                <HeartIcon
                  filled={isFavorite(card.id)}
                  onClick={(e) => handleFavoriteClick(e, card.id)}
                />
              </div>
              <h3 className="card-title">{card.title}</h3>
              <p className="card-excerpt">{getCardExcerpt(card.content)}</p>
              <div className="card-footer">
                <StarRating rating={card.difficulty} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardList;
