import React from 'react';
import { Card, CATEGORY_COLORS, Category } from './types';

interface CardItemProps {
  card: Card;
  index: number;
  keyword: string;
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

const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword.trim()) {
    return text;
  }

  const lowerKeyword = keyword.toLowerCase();
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(lowerKeyword);

  if (index === -1) {
    return text;
  }

  const before = text.substring(0, index);
  const match = text.substring(index, index + keyword.length);
  const after = text.substring(index + keyword.length);

  return (
    <>
      {before}
      <mark className="highlight">{match}</mark>
      {after.includes(keyword) ? highlightText(after, keyword) : after}
    </>
  );
};

const CardItem: React.FC<CardItemProps> = ({ card, index, keyword, onToggleFavorite, onClick }) => {
  const categoryColor = CATEGORY_COLORS[card.category as Category];
  const isCategoryMatch = keyword.trim() && card.category.toLowerCase().includes(keyword.toLowerCase());

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
      <div className={`card-category ${isCategoryMatch ? 'category-highlight' : ''}`} style={{ backgroundColor: categoryColor }}>
        {isCategoryMatch ? highlightText(card.category, keyword) : card.category}
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
        <h3 className="card-title">{highlightText(card.title, keyword)}</h3>
        <p className="card-preview">{highlightText(getPreviewText(card.content), keyword)}</p>
      </div>

      <div className="card-footer">
        <StarRating rating={card.difficulty} />
      </div>
    </div>
  );
};

export default CardItem;
