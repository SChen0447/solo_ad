import React from 'react';
import { Card, CATEGORY_COLORS, Category } from './types';

interface CardItemProps {
  card: Card;
  index: number;
  onToggleFavorite: (id: string) => void;
  onClick: (id: string) => void;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? 'filled' : ''}`}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const CardItem: React.FC<CardItemProps> = ({ card, index, onToggleFavorite, onClick }) => {
  const categoryColor = CATEGORY_COLORS[card.category as Category];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(card.id);
  };

  const getPreviewText = (content: string) => {
    const text = content.replace(/[#*`\-\n]/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  };

  return (
    <div
      id={`card-${card.id}`}
      className="card"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onClick(card.id)}
    >
      <div className="card-category" style={{ backgroundColor: categoryColor }}>
        {card.category}
      </div>

      <button
        className={`favorite-btn ${card.favorited ? 'favorited' : ''}`}
        onClick={handleFavoriteClick}
      >
        <svg viewBox="0 0 24 24" fill={card.favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      <div className="card-content">
        <h3 className="card-title">{card.title}</h3>
        <p className="card-preview">{getPreviewText(card.content)}</p>
      </div>

      <div className="card-footer">
        <StarRating rating={card.difficulty} />
      </div>
    </div>
  );
};

export default CardItem;
