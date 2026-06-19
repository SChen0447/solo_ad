import React, { useState } from 'react';
import type { Resource } from '../data/resources';

interface ResourceCardProps {
  resource: Resource;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onExchange: (resource: Resource) => void;
}

const typeColors: Record<string, string> = {
  '笔记': '#4299E1',
  '习题': '#48BB78',
  '课件': '#ED8936',
  '其他': '#9F7AEA',
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, isFavorited, onToggleFavorite, onExchange }) => {
  const [starSpinning, setStarSpinning] = useState(false);

  const handleFavorite = () => {
    setStarSpinning(true);
    onToggleFavorite(resource.id);
    setTimeout(() => setStarSpinning(false), 300);
  };

  return (
    <div className="resource-card">
      <div className="card-header">
        <h3 className="card-title">{resource.title}</h3>
        <span
          className="type-badge"
          style={{ backgroundColor: typeColors[resource.type] || '#9F7AEA' }}
        >
          {resource.type}
        </span>
      </div>
      <p className="card-description">{resource.description}</p>
      <div className="card-footer">
        <span className="card-author">{resource.author}</span>
        <div className="card-actions">
          <button
            className={`fav-btn ${isFavorited ? 'favorited' : ''} ${starSpinning ? 'spinning' : ''}`}
            onClick={handleFavorite}
            title={isFavorited ? '取消收藏' : '收藏'}
          >
            ★
          </button>
          <button className="exchange-btn" onClick={() => onExchange(resource)}>
            交换
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
