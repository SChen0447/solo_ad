import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, RefreshCw, Gift, ShoppingBag } from 'lucide-react';
import type { Item } from '../backend/types';

interface DriftCardProps {
  item: Item;
  userId: string;
  onLikeChange?: (itemId: string, liked: boolean, likes: number) => void;
}

const DriftCard: React.FC<DriftCardProps> = ({ item, userId, onLikeChange }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(item.likedBy.includes(userId));
  const [likes, setLikes] = useState(item.likes);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-like-button')) {
      return;
    }
    navigate(`/item/${item.id}`);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isAnimating) return;
    setIsAnimating(true);

    try {
      const response = await fetch(`/api/items/${item.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      
      setIsLiked(data.liked);
      setLikes(data.likes);
      
      if (onLikeChange) {
        onLikeChange(item.id, data.liked, data.likes);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const getTagConfig = () => {
    switch (item.exchangeType) {
      case 'exchange':
        return { icon: <RefreshCw size={12} />, text: '可交换', className: 'exchange' };
      case 'gift':
        return { icon: <Gift size={12} />, text: '可赠送', className: 'gift' };
      case 'sell':
        return { icon: <ShoppingBag size={12} />, text: '可出售', className: 'sell' };
      default:
        return { icon: null, text: '', className: '' };
    }
  };

  const tagConfig = getTagConfig();

  return (
    <div
      className="drift-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as React.MouseEvent)}
    >
      <div className={`card-image-container ${!imageLoaded ? 'lazy-image' : ''}`}>
        <img
          src={item.images[0]}
          alt={item.name}
          className="card-image"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      </div>

      <div className={`card-tag ${tagConfig.className}`}>
        {tagConfig.icon}
        <span>{tagConfig.text}</span>
      </div>

      <div className="card-title">
        {item.name}
      </div>

      <button
        className={`card-like-button ${isLiked ? 'liked' : ''}`}
        onClick={handleLikeClick}
        aria-label={isLiked ? '取消点赞' : '点赞'}
      >
        <Heart fill={isLiked ? '#ef4444' : 'none'} />
      </button>

      <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '12px', color: 'white', fontWeight: '500', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
        ❤ {likes}
      </div>
    </div>
  );
};

export default DriftCard;
