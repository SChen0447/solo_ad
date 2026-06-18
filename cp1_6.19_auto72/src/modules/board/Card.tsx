import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { CardData } from './boardStore';
import './Card.css';

interface CardProps {
  card: CardData;
  variant?: 'sidebar' | 'board';
  isDragging?: boolean;
  isSelected?: boolean;
  isConnecting?: boolean;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onDragStart?: (e: React.MouseEvent, card: CardData) => void;
  onDragEnd?: () => void;
  onDoubleClick?: (card: CardData) => void;
  onClick?: (card: CardData) => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  card,
  variant = 'sidebar',
  isDragging = false,
  isSelected = false,
  isConnecting = false,
  onDelete,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  onDoubleClick,
  onClick,
  style,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDeleting(true);
      setTimeout(() => {
        onDelete?.(card.id);
      }, 200);
    },
    [card.id, onDelete]
  );

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFavoriting(true);
      setTimeout(() => {
        onToggleFavorite?.(card.id);
        setIsFavoriting(false);
      }, 400);
    },
    [card.id, onToggleFavorite]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      onDragStart?.(e, card);
    },
    [card, onDragStart]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(card);
    },
    [card, onClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(card);
    },
    [card, onDoubleClick]
  );

  useEffect(() => {
    const img = new Image();
    img.src = card.thumbnail;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true);
  }, [card.thumbnail]);

  return (
    <div
      ref={cardRef}
      className={`inspiration-card card-${variant} ${isDragging ? 'card-dragging' : ''} ${
        isDeleting ? 'card-deleting' : ''
      } ${isSelected ? 'card-selected' : ''} ${
        isConnecting ? 'card-connecting' : ''
      }`}
      style={style}
      onMouseDown={variant === 'board' ? handleMouseDown : undefined}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="card-thumbnail">
        {imageLoaded ? (
          <img src={card.thumbnail} alt={card.title} />
        ) : (
          <div className="card-thumbnail-placeholder" style={{ background: card.colors[0] }} />
        )}
        <div className="card-color-bar">
          {card.colors.map((color, idx) => (
            <div
              key={idx}
              className="card-color-dot"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{card.title}</h3>
        <p className="card-summary">{card.summary}</p>
      </div>

      <button
        className={`card-favorite ${card.isFavorite ? 'active' : ''} ${
          isFavoriting ? 'animating' : ''
        }`}
        onClick={handleFavorite}
        title={card.isFavorite ? '取消收藏' : '收藏'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>

      <button
        className="card-delete-btn"
        onClick={handleDelete}
        title="删除"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Card;
