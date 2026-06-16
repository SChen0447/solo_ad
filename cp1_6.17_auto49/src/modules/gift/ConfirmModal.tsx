import React, { useState } from 'react';
import { GiftItem } from '../../types';

interface ConfirmModalProps {
  gift: GiftItem;
  onConfirm: (targetName: string) => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  gift,
  onConfirm,
  onCancel,
}) => {
  const [targetName, setTargetName] = useState('');

  const handleSubmit = () => {
    if (targetName.trim()) {
      onConfirm(targetName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">赠送礼物</h3>
        <div className="modal-gift-info">
          <span className="modal-gift-icon">{gift.iconUrl}</span>
          <span className="modal-gift-name">{gift.name}</span>
          <span className="modal-gift-value">价值 {gift.value} 币</span>
        </div>
        <div className="modal-input-group">
          <label htmlFor="target-input">赠送对象</label>
          <input
            id="target-input"
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入主播昵称"
            className="modal-input"
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel-btn" onClick={onCancel}>
            取消
          </button>
          <button
            className="modal-btn confirm-btn"
            onClick={handleSubmit}
            disabled={!targetName.trim()}
          >
            确认赠送
          </button>
        </div>
      </div>
    </div>
  );
};
