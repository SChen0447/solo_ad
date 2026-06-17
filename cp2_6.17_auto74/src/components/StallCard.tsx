import React from 'react';

export interface StallListItem {
  id: string;
  name: string;
  ownerNickname: string;
  description: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  interactionCount: number;
  createdAt: number;
}

interface StallCardProps {
  stall: StallListItem;
  onViewDetail: (stallId: string) => void;
}

const StallCard: React.FC<StallCardProps> = React.memo(({ stall, onViewDetail }) => {
  const handleClick = () => {
    onViewDetail(stall.id);
  };

  return (
    <div className="stall-card" onClick={handleClick}>
      <div className="stall-card-image">
        {stall.images.length > 0 ? (
          <img src={stall.images[0]} alt={stall.name} loading="lazy" />
        ) : (
          <div className="stall-card-placeholder">🎨</div>
        )}
      </div>
      <div className="stall-card-content">
        <h3 className="stall-card-title">{stall.name}</h3>
        <p className="stall-card-owner">摊主：{stall.ownerNickname}</p>
        <div className="stall-card-stats">
          <span className="stall-card-stat">
            <span className="stat-icon">❤️</span>
            <span>{stall.likesCount}</span>
          </span>
          <span className="stall-card-stat">
            <span className="stat-icon">💬</span>
            <span>{stall.commentsCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
});

StallCard.displayName = 'StallCard';

export default StallCard;
