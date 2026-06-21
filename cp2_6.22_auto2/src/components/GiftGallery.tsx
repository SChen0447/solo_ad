import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Gift } from '@/types';

interface GiftGalleryProps {
  gifts: Gift[];
}

const GiftGallery: React.FC<GiftGalleryProps> = React.memo(({ gifts }) => {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (id: string) => {
      navigate(`/gift/${id}`);
    },
    [navigate]
  );

  if (gifts.length === 0) {
    return (
      <div className="gift-gallery__empty">
        <p>还没有礼物，快来登记第一个吧！</p>
      </div>
    );
  }

  return (
    <div className="gift-gallery">
      {gifts.map((gift, index) => (
        <div
          key={gift.id}
          className={`gift-card ${index === 0 ? 'gift-card--new' : ''}`}
          onClick={() => handleClick(gift.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick(gift.id)}
        >
          <div className="gift-card__image-wrap">
            <img
              src={gift.photoUrl}
              alt={gift.name}
              className="gift-card__image"
              loading="lazy"
            />
          </div>
          <div className="gift-card__body">
            <h3 className="gift-card__name">{gift.name}</h3>
            <div className="gift-card__meta">
              <span className="gift-card__city">📍 {gift.city}</span>
              <span className="gift-card__category">{gift.category}</span>
            </div>
            <div className="gift-card__footer">
              <span className="gift-card__value">¥{gift.value}</span>
              <span
                className={`gift-card__status gift-card__status--${gift.status}`}
              >
                {gift.status === 'available' ? '可交换' : '已交换'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

GiftGallery.displayName = 'GiftGallery';

export default GiftGallery;
