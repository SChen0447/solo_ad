import React from 'react';
import FlashCard from './FlashCard';
import type { FlashCardData } from '../services/cardService';

interface CardListProps {
  cards: FlashCardData[];
  newCardId: string | null;
  activeTag: string | null;
  onTagClick: (tag: string) => void;
  onDelete: (id: string) => void;
}

const CardList: React.FC<CardListProps> = ({ cards, newCardId, activeTag, onTagClick, onDelete }) => {
  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-text">
          还没有知识碎片<br />添加你的第一条阅读笔记吧
        </div>
      </div>
    );
  }

  return (
    <div>
      {activeTag && (
        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>筛选标签:</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {activeTag}
          </span>
        </div>
      )}
      <div className="masonry-grid">
        {cards.map(card => (
          <div
            key={card.id}
            className="masonry-item"
            style={{
              animation: newCardId === card.id ? 'none' : undefined,
            }}
          >
            <FlashCard
              card={card}
              isNew={newCardId === card.id}
              onTagClick={onTagClick}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardList;
