import React, { useState } from 'react';

export interface WishlistItem {
  id: string;
  itemName: string;
  description: string | null;
  preference: string | null;
}

export interface EnvelopeCardProps {
  receiverName: string;
  wishlist: WishlistItem[];
  address: string | null;
  giftSent: boolean;
  onGiftSent: () => void;
}

const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  receiverName,
  wishlist,
  address,
  giftSent,
  onGiftSent,
}) => {
  const [opened, setOpened] = useState(false);
  const [showShake, setShowShake] = useState(false);

  const handleGiftSent = () => {
    if (!giftSent) {
      setShowShake(true);
      setTimeout(() => setShowShake(false), 400);
      onGiftSent();
    }
  };

  return (
    <div className="envelope-container">
      <div
        className={`envelope-wrapper ${opened ? 'envelope-opened' : ''}`}
        onClick={() => !opened && setOpened(true)}
      >
        <div className="envelope-body"></div>
        <div className="envelope-flap"></div>
        <div className="envelope-content-wrapper">
          <div className="gift-info-card">
            <div className="receiver-name">{receiverName}</div>

            {wishlist.length > 0 && (
              <>
                <div className="section-title">心愿清单</div>
                {wishlist.map((item) => (
                  <div key={item.id} className="wishlist-item">
                    <span className="star-icon">★</span>
                    <div className="wishlist-content">
                      <div className="wishlist-name">{item.itemName}</div>
                      {item.description && (
                        <div className="wishlist-desc">{item.description}</div>
                      )}
                      {item.preference && (
                        <div className="wishlist-pref">偏好: {item.preference}</div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {address && (
              <>
                <div className="section-title">收货地址</div>
                <div className="address-info">{address}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {!opened && (
        <div className="envelope-click-hint">👆 点击信封打开，查看你抽中的人</div>
      )}

      {opened && (
        <button
          className={`btn btn-block ${giftSent ? 'btn-success' : 'btn-gold'} ${showShake ? 'shake-animation' : ''}`}
          style={{ maxWidth: 320, marginTop: 24 }}
          onClick={handleGiftSent}
          disabled={giftSent}
        >
          {giftSent ? '✓ 已送出' : '确认礼物已送出'}
        </button>
      )}
    </div>
  );
};

export default EnvelopeCard;
