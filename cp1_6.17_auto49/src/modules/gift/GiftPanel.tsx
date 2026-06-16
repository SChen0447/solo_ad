import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GiftItem } from '../../types';
import { ConfirmModal } from './ConfirmModal';

interface GiftPanelProps {
  onGiftSend: (gift: GiftItem, targetName: string) => void;
}

export const GiftPanel: React.FC<GiftPanelProps> = ({ onGiftSend }) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    axios
      .get<GiftItem[]>('/api/gifts')
      .then((res) => setGifts(res.data))
      .catch(() => {
        const fallback: GiftItem[] = [
          { id: '1', name: '玫瑰', iconUrl: '🌹', value: 10 },
          { id: '2', name: '钻石', iconUrl: '💎', value: 100 },
          { id: '3', name: '火箭', iconUrl: '🚀', value: 500 },
          { id: '4', name: '皇冠', iconUrl: '👑', value: 1000 },
          { id: '5', name: '爱心', iconUrl: '❤️', value: 50 },
          { id: '6', name: '星星', iconUrl: '⭐', value: 20 },
          { id: '7', name: '彩虹', iconUrl: '🌈', value: 200 },
          { id: '8', name: '烟花', iconUrl: '🎆', value: 300 },
        ];
        setGifts(fallback);
      });
  }, []);

  const handleGiftClick = (gift: GiftItem) => {
    setSelectedGift(gift);
    setShowModal(true);
  };

  const handleConfirm = (targetName: string) => {
    if (selectedGift) {
      onGiftSend(selectedGift, targetName);
    }
    setShowModal(false);
    setSelectedGift(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setSelectedGift(null);
  };

  return (
    <div className="gift-panel">
      <h3 className="gift-panel-title">🎁 礼物面板</h3>
      <div className="gift-grid">
        {gifts.map((gift) => (
          <button
            key={gift.id}
            className="gift-item"
            onClick={() => handleGiftClick(gift)}
          >
            <span className="gift-icon">{gift.iconUrl}</span>
            <span className="gift-name">{gift.name}</span>
            <span className="gift-value">{gift.value} 币</span>
          </button>
        ))}
      </div>
      {showModal && selectedGift && (
        <ConfirmModal
          gift={selectedGift}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
