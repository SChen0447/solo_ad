import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Card, Category } from './types';
import { CATEGORY_CONFIG } from './types';

interface CardListProps {
  cards: Card[];
  favoriteCardIds: string[];
  onToggleFavorite: (cardId: string) => void;
  onCreateCard: () => void;
}

function StarRating({ difficulty }: { difficulty: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            fontSize: 14,
            color: n <= difficulty ? '#f59e0b' : '#d1d5db'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function FavoriteThumb({
  card,
  onClick
}: {
  card: Card;
  onClick: () => void;
}) {
  const config = CATEGORY_CONFIG[card.category];
  return (
    <div
      onClick={onClick}
      style={{
        flex: '0 0 120px',
        width: 120,
        height: 60,
        borderRadius: 8,
        background: '#fff',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          padding: '4px 10px',
          background: config.color,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700
        }}
      >
        {config.label}
      </div>
      <div
        style={{
          padding: 8,
          fontSize: 12,
          fontWeight: 600,
          color: '#1f2937',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.4
        }}
      >
        {card.title}
      </div>
    </div>
  );
}

function KnowledgeCard({
  card,
  index,
  isFavorite,
  onToggleFavorite,
  onClick
}: {
  card: Card;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  const config = CATEGORY_CONFIG[card.category];
  return (
    <div
      onClick={onClick}
      style={{
        width: 320,
        maxWidth: '100%',
        borderRadius: 12,
        background: '#fff',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: `slideUp 0.3s ease-out ${index * 0.05}s both`,
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: config.color
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 8px'
      }}>
        <span style={{
          padding: '3px 10px',
          borderRadius: 4,
          background: config.color,
          color: '#fff',
          fontSize: 12,
          fontWeight: 700
        }}>
          {config.label}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: isFavorite ? '#ef4444' : '#d1d5db',
            padding: 4,
            transition: 'color 0.2s, transform 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 8,
          lineHeight: 1.4
        }}>
          {card.title}
        </h3>
        <p style={{
          fontSize: 13,
          color: '#6b7280',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 12
        }}>
          {card.content.replace(/[#*`>\-]/g, '').slice(0, 100)}
          {card.content.length > 100 ? '...' : ''}
        </p>
      </div>

      <div style={{
        padding: '0 16px 16px',
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <StarRating difficulty={card.difficulty} />
      </div>
    </div>
  );
}

export default function CardList({
  cards,
  favoriteCardIds,
  onToggleFavorite,
  onCreateCard
}: CardListProps) {
  const navigate = useNavigate();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const favoriteCards = cards.filter(c => favoriteCardIds.includes(c.id));

  const scrollToCard = (cardId: string) => {
    const el = cardRefs.current.get(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
      setTimeout(() => {
        el.style.boxShadow = '';
      }, 1500);
    }
  };

  return (
    <main style={{
      flex: 1,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }}>
      {favoriteCards.length > 0 && (
        <section style={{
          height: 80,
          background: '#fafbfc',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          overflowX: 'auto'
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#6b7280',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ color: '#ef4444' }}>♥</span>
            我的收藏 ({favoriteCards.length})
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {favoriteCards.map((card) => (
              <FavoriteThumb
                key={card.id}
                card={card}
                onClick={() => scrollToCard(card.id)}
              />
            ))}
          </div>
        </section>
      )}

      <div style={{
        padding: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            知识卡片
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            共 {cards.length} 张卡片
          </p>
        </div>
        <button
          onClick={onCreateCard}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
        >
          <span style={{ fontSize: 16 }}>+</span>
          新建卡片
        </button>
      </div>

      {cards.length === 0 ? (
        <div style={{
          padding: 80,
          textAlign: 'center',
          color: '#9ca3af',
          background: '#f9fafb',
          margin: '0 24px',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            暂无匹配的卡片
          </p>
          <p style={{ fontSize: 12 }}>
            试试调整筛选条件，或创建一张新的知识卡片吧
          </p>
        </div>
      ) : (
        <div style={{
          padding: '0 24px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20
        }}>
          {cards.map((card, index) => (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el);
              }}
            >
              <KnowledgeCard
                card={card}
                index={index}
                isFavorite={favoriteCardIds.includes(card.id)}
                onToggleFavorite={() => onToggleFavorite(card.id)}
                onClick={() => navigate(`/card/${card.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
