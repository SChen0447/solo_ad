import React, { useState, useCallback, useMemo } from 'react';
import { Star } from 'lucide-react';
import type { Inspiration, Tag } from '../types';
import { useStore } from '../store/useStore';

interface InspirationCardProps {
  inspiration: Inspiration;
  tags: Tag[];
  onClick: () => void;
}

const TAG_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe'];

const InspirationCard: React.FC<InspirationCardProps> = ({ inspiration, tags, onClick }) => {
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const toggleFavorite = useStore(state => state.toggleFavorite);

  const getTagColor = useCallback((tagName: string) => {
    const tag = tags.find(t => t.name === tagName);
    if (tag) return tag.color;
    const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
  }, [tags]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPulsingId(inspiration.id);
    toggleFavorite(inspiration.id);
    setTimeout(() => setPulsingId(null), 400);
  }, [inspiration.id, toggleFavorite);

  const cardTags = useMemo(() => (
    <div style={{ marginBottom: '12px' }}>
      {inspiration.tags.map(tag => (
        <span
          key={tag}
          className="card-tag-badge"
          style={{ backgroundColor: getTagColor(tag) }}
        >
          {tag}
        </span>
      ))}
    </div>
  ), [inspiration.tags, getTagColor]);

  return (
    <div
      className="inspiration-card"
      onClick={onClick}
    >
      {cardTags}
      <button
        className={`card-favorite${inspiration.isFavorite ? ' favorited' : ''}${pulsingId === inspiration.id ? ' pulse' : ''}`}
        onClick={handleFavoriteClick}
        aria-label={inspiration.isFavorite ? '取消收藏' : '收藏'}
      >
        <Star size={18} />
      </button>
      <h3 className="card-title">{inspiration.title}</h3>
      <p className="card-content">{inspiration.content}</p>
      {inspiration.imageUrl && (
        <img
          src={inspiration.imageUrl}
          alt={inspiration.title}
          className="card-image"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
};

export default React.memo(InspirationCard);
