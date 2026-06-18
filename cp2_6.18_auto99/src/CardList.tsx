import React from 'react';
import { Card, CATEGORY_COLORS, Category } from './types';
import CardItem from './CardItem';

interface CardListProps {
  cards: Card[];
  favorites: Card[];
  onToggleFavorite: (id: string) => void;
  onCardClick: (id: string) => void;
  onFavoriteClick: (id: string) => void;
}

const FavoriteThumb: React.FC<{ card: Card; onClick: () => void }> = ({ card, onClick }) => {
  const categoryColor = CATEGORY_COLORS[card.category as Category];

  return (
    <div className="favorite-thumb" onClick={onClick}>
      <div className="thumb-category" style={{ backgroundColor: categoryColor }}>
        {card.category}
      </div>
      <div className="thumb-title">{card.title}</div>
    </div>
  );
};

const CardList: React.FC<CardListProps> = ({
  cards,
  favorites,
  onToggleFavorite,
  onCardClick,
  onFavoriteClick
}) => {
  return (
    <div className="card-list-container">
      {favorites.length > 0 && (
        <div className="favorites-bar">
          <div className="favorites-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            我的收藏
          </div>
          <div className="favorites-scroll">
            {favorites.map((card) => (
              <FavoriteThumb
                key={card.id}
                card={card}
                onClick={() => onFavoriteClick(card.id)}
              />
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6M9 13h6M9 17h4" />
          </svg>
          <p>没有找到相关卡片</p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((card, index) => (
            <CardItem
              key={card.id}
              card={card}
              index={index}
              onToggleFavorite={onToggleFavorite}
              onClick={onCardClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CardList;
