import React, { useState } from 'react';
import type { FlashCardData } from '../services/cardService';

interface FlashCardProps {
  card: FlashCardData;
  isNew?: boolean;
  onTagClick: (tag: string) => void;
  onDelete: (id: string) => void;
}

const FlashCard: React.FC<FlashCardProps> = ({ card, isNew = false, onTagClick, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const gradientStyle: React.CSSProperties = card.sourceType === 'book'
    ? { background: 'linear-gradient(135deg, #FB923C, #F472B6)' }
    : { background: 'linear-gradient(135deg, #60A5FA, #A78BFA)' };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div
      className={isNew ? 'card-enter' : ''}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: '#fff',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? 'var(--shadow-hover)' : 'var(--shadow-sm)',
        cursor: 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        ...gradientStyle,
        height: '4px',
        width: '100%',
      }} />

      <div style={{ padding: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: card.sourceType === 'book' ? '#EA580C' : '#4F46E5',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              ...gradientStyle,
              display: 'inline-block',
            }} />
            {card.sourceType === 'book' ? '书籍' : '文章'}
          </div>
          <span style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
          }}>
            {formatDate(card.createdAt)}
          </span>
        </div>

        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: '8px',
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}>
          {card.source}
        </div>

        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
          marginBottom: '10px',
          padding: '10px 12px',
          background: '#F9FAFB',
          borderRadius: 'var(--radius-sm)',
          borderLeft: `3px solid ${card.sourceType === 'book' ? '#FB923C' : '#60A5FA'}`,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}>
          {card.excerpt}
        </div>

        {card.annotation && (
          <div style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            marginBottom: '10px',
            fontStyle: 'italic',
            paddingLeft: '10px',
            borderLeft: '2px solid var(--color-border)',
          }}>
            💭 {card.annotation}
          </div>
        )}

        {card.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {card.tags.map(tag => {
              const allTags = JSON.parse(localStorage.getItem('customTags') || '[]');
              const preset = [
                { name: '哲学', color: '#6366F1' }, { name: '心理学', color: '#8B5CF6' },
                { name: '科技', color: '#3B82F6' }, { name: '文学', color: '#EC4899' },
                { name: '历史', color: '#F59E0B' }, { name: '设计', color: '#10B981' },
                { name: '商业', color: '#EF4444' }, { name: '科学', color: '#06B6D4' },
                { name: '艺术', color: '#F472B6' }, { name: '社会学', color: '#8B5CF6' },
                { name: '经济', color: '#14B8A6' }, { name: '教育', color: '#F97316' },
              ];
              const found = [...preset, ...allTags].find((t: { name: string; color: string }) => t.name === tag);
              const color = found ? found.color : '#6B7280';

              return (
                <span
                  key={tag}
                  className="tag-bubble"
                  style={{ background: color, fontSize: '11px', padding: '2px 10px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card.id);
        }}
        style={{ opacity: isHovered ? 1 : 0 }}
      >
        ✕
      </button>
    </div>
  );
};

export default FlashCard;
