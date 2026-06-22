import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Gift } from '../types';
import { categoryLabels, statusLabels } from '../types';
import './GiftGallery.css';

interface GiftGalleryProps {
  gifts: Gift[];
  newGiftId?: string;
}

const GiftGallery: React.FC<GiftGalleryProps> = ({ gifts, newGiftId }) => {
  const navigate = useNavigate();

  const handleCardClick = (id: string) => {
    navigate(`/gift/${id}`);
  };

  return (
    <div className="gift-gallery">
      <h2 className="gallery-title">礼物画廊</h2>
      {gifts.length === 0 ? (
        <div className="empty-state">
          <p>还没有礼物，快去登记一个吧！</p>
        </div>
      ) : (
        <div className="gift-grid">
          {gifts.map((gift, index) => (
            <div
              key={gift.id}
              className={`gift-card ${gift.id === newGiftId ? 'new-gift' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleCardClick(gift.id)}
            >
              <div className="gift-image-wrapper">
                <img src={gift.photoUrl} alt={gift.name} className="gift-image" />
                <span className={`status-badge status-${gift.status}`}>
                  {statusLabels[gift.status]}
                </span>
              </div>
              <div className="gift-info">
                <h3 className="gift-name">{gift.name}</h3>
                <div className="gift-meta">
                  <span className="gift-category">{categoryLabels[gift.category]}</span>
                  <span className="gift-city">📍 {gift.city}</span>
                </div>
                <div className="gift-footer">
                  <span className="gift-value">¥{gift.value}</span>
                  <span className="gift-owner">{gift.owner}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(GiftGallery);
