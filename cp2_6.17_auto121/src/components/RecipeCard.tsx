import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface RecipeCardProps {
  id: string;
  title: string;
  image: string;
  time: number;
  isFavorite: boolean;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  compact?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ title, image, time, isFavorite, onClick, onToggleFavorite, compact = false }) => {
  const [animating, setAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimating(true);
    onToggleFavorite(e);
    setTimeout(() => setAnimating(false), 250);
  };

  const cardHeight = compact ? 260 : 320;
  const imgHeight = compact ? 140 : 160;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 240,
        height: cardHeight,
        marginTop: hovered ? -6 : 0,
        marginBottom: hovered ? 6 : 0,
        borderRadius: 20,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: hovered ? '0 10px 30px rgba(0,0,0,0.12)' : 'none',
        transition: 'margin-top 0.35s ease-out, margin-bottom 0.35s ease-out, box-shadow 0.35s ease-out',
      }}
    >
      <div style={{ width: 240, height: imgHeight, overflow: 'hidden' }}>
        <img
          src={image}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      </div>
      <div style={{ padding: compact ? '12px' : '16px', display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
        <h3
          style={{
            fontSize: compact ? 15 : 18,
            fontWeight: 700,
            color: '#1f2937',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h3>
        <span style={{ fontSize: compact ? 12 : 14, color: '#6b7280' }}>
          ⏱ {time} 分钟
        </span>
      </div>
      <button
        onClick={handleFavorite}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(255,255,255,0.9)',
          border: 'none',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.25s ease-in-out',
          transform: animating ? 'scale(0.8)' : 'scale(1)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Heart
          size={16}
          fill={isFavorite ? '#ef4444' : 'none'}
          color={isFavorite ? '#ef4444' : '#9ca3af'}
          style={{ transition: 'color 0.25s, fill 0.25s' }}
        />
      </button>
    </div>
  );
};

export default RecipeCard;
