import { useState, memo } from 'react';
import type { Resource } from '../types';
import './ResourceCard.css';

interface ResourceCardProps {
  resource: Resource;
  isFavorite: boolean;
  onFavorite: (resourceId: string) => void;
  onExchange: (resource: Resource) => void;
}

const ResourceCard = memo(function ResourceCard({
  resource,
  isFavorite,
  onFavorite,
  onExchange
}: ResourceCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);

  const handleFavoriteClick = () => {
    setIsAnimating(true);
    onFavorite(resource.id);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleExchangeClick = () => {
    setShowExchangeDialog(true);
  };

  const handleConfirmExchange = () => {
    setShowExchangeDialog(false);
    onExchange(resource);
  };

  const typeColors: Record<string, string> = {
    '笔记': '#4299E1',
    '习题': '#ED8936',
    '课件': '#9F7AEA',
    '其他': '#718096'
  };

  return (
    <>
      <div className="resource-card">
        <div className="card-header">
          <span
            className="type-tag"
            style={{ backgroundColor: typeColors[resource.type] + '20', color: typeColors[resource.type] }}
          >
            {resource.type}
          </span>
        </div>
        <h3 className="card-title">{resource.title}</h3>
        <p className="card-description">{resource.description}</p>
        <div className="card-footer">
          <span className="owner-info">
            发布者：{resource.ownerName}
          </span>
          <div className="card-actions">
            <button
              className="exchange-btn"
              onClick={handleExchangeClick}
              title="申请交换"
            >
              交换
            </button>
            <button
              className={`favorite-btn ${isFavorite ? 'favorited' : ''} ${isAnimating ? 'animate-spin' : ''}`}
              onClick={handleFavoriteClick}
              title={isFavorite ? '取消收藏' : '收藏'}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill={isFavorite ? 'var(--color-accent-gold)' : 'none'}
                stroke={isFavorite ? 'var(--color-accent-gold)' : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showExchangeDialog && (
        <div className="modal-overlay" onClick={() => setShowExchangeDialog(false)}>
          <div className="exchange-dialog animate-slide-in-top" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">确认交换申请</h3>
            <p className="dialog-content">
              确定要向 <strong>{resource.ownerName}</strong> 申请交换
              <strong>「{resource.title}」</strong> 吗？
            </p>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowExchangeDialog(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmExchange}
              >
                确认申请
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ResourceCard;
