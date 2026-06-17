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
}

const RecipeCard: React.FC<RecipeCardProps> = ({ title, image, time, isFavorite, onClick, onToggleFavorite }) => {
  const [animating, setAnimating] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimating(true);
    onToggleFavorite(e);
    setTimeout(() => setAnimating(false), 250);
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
      style={{
        width: 240,
        height: 320,
        borderRadius: 20,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.35s ease-out, box-shadow 0.35s ease-out',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ width: 240, height: 160, overflow: 'hidden' }}>
        <img
          src={image}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3
          style={{
            fontSize: 18,
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
        <span style={{ fontSize: 14, color: '#6b7280' }}>
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
