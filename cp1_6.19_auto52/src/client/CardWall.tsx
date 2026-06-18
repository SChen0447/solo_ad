import React from 'react';
import type { Card, SortType } from './types';

interface CardWallProps {
  cards: Card[];
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
  onCardClick: (card: Card) => void;
  onVote: (cardId: string) => void;
  votedCards: Set<string>;
  isAnimating: boolean;
}

const CardWall: React.FC<CardWallProps> = ({
  cards,
  sortType,
  onSortChange,
  onCardClick,
  onVote,
  votedCards,
  isAnimating,
}) => {
  const truncateTitle = (title: string): string => {
    if (title.length <= 40) return title;
    return title.slice(0, 40) + '...';
  };

  const truncateContent = (content: string): string => {
    if (content.length <= 100) return content;
    return content.slice(0, 100) + '...';
  };

  const handleVoteClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    if (!votedCards.has(cardId)) {
      onVote(cardId);
    }
  };

  return (
    <div className="card-wall">
      <div className="sort-controls">
        <button
          className={`sort-btn ${sortType === 'latest' ? 'active' : ''}`}
          onClick={() => onSortChange('latest')}
        >
          最新
        </button>
        <button
          className={`sort-btn ${sortType === 'hot' ? 'active' : ''}`}
          onClick={() => onSortChange('hot')}
        >
          最热
        </button>
      </div>
      <div className={`cards-grid ${isAnimating ? 'fade-in' : ''}`}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="card"
            onClick={() => onCardClick(card)}
          >
            <div className="vote-badge">{card.votes}</div>
            <h3 className="card-title">{truncateTitle(card.title)}</h3>
            <p className="card-content">{truncateContent(card.content)}</p>
            <div className="card-footer">
              <button
                className={`vote-btn ${votedCards.has(card.id) ? 'voted' : ''}`}
                onClick={(e) => handleVoteClick(e, card.id)}
                disabled={votedCards.has(card.id)}
              >
                <span className="vote-icon">▲</span>
                <span>赞同</span>
              </button>
              <div className="comment-info">
                <span className="comment-icon">💬</span>
                <span>{card.comments.length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardWall;
