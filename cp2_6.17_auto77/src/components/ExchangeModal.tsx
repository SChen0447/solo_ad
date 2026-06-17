import React, { useState } from 'react';
import { ArrowLeftRight, UserCheck, Package, X } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  imageUrl: string;
}

interface User {
  id: string;
  nickname: string;
  creditScore: number;
}

interface ExchangeRequest {
  id: string;
  fromItem: Item;
  toItem: Item;
  fromUser: User;
  toUser: User;
}

interface ExchangeModalProps {
  exchangeRequest: ExchangeRequest;
  onClose: () => void;
  onConfirm: (exchangeId: string) => void;
}

const getCreditColor = (score: number): string => {
  if (score < 50) return '#d32f2f';
  if (score < 80) return '#f9a825';
  return '#388e3c';
};

const ExchangeModal: React.FC<ExchangeModalProps> = ({ exchangeRequest, onClose, onConfirm }) => {
  const [fromImageError, setFromImageError] = useState(false);
  const [toImageError, setToImageError] = useState(false);

  const handleConfirm = () => {
    onConfirm(exchangeRequest.id);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content exchange-modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="exchange-modal-title">确认交换</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
          >
            <X size={20} />
          </button>
        </div>
        <p className="exchange-modal-subtitle">请确认以下交换信息</p>

        <div className="exchange-items-compare">
          <div className="exchange-item-side">
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>发起方</div>
            <div className="exchange-item-thumb">
              {fromImageError || !exchangeRequest.fromItem.imageUrl ? (
                <div className="item-card-image-placeholder">
                  <Package size={32} />
                </div>
              ) : (
                <img
                  src={exchangeRequest.fromItem.imageUrl}
                  alt={exchangeRequest.fromItem.title}
                  onError={() => setFromImageError(true)}
                />
              )}
            </div>
            <div className="exchange-item-name">{exchangeRequest.fromItem.title}</div>
            <div
              className="exchange-item-credit"
              style={{ color: getCreditColor(exchangeRequest.fromUser.creditScore) }}
            >
              <UserCheck size={12} />
              <span>{exchangeRequest.fromUser.creditScore}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {exchangeRequest.fromUser.nickname}
            </div>
          </div>

          <div className="exchange-arrow">
            <ArrowLeftRight size={32} />
          </div>

          <div className="exchange-item-side">
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>接收方</div>
            <div className="exchange-item-thumb">
              {toImageError || !exchangeRequest.toItem.imageUrl ? (
                <div className="item-card-image-placeholder">
                  <Package size={32} />
                </div>
              ) : (
                <img
                  src={exchangeRequest.toItem.imageUrl}
                  alt={exchangeRequest.toItem.title}
                  onError={() => setToImageError(true)}
                />
              )}
            </div>
            <div className="exchange-item-name">{exchangeRequest.toItem.title}</div>
            <div
              className="exchange-item-credit"
              style={{ color: getCreditColor(exchangeRequest.toUser.creditScore) }}
            >
              <UserCheck size={12} />
              <span>{exchangeRequest.toUser.creditScore}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {exchangeRequest.toUser.nickname}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            确认交换
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeModal;
