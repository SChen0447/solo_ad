import { useState, useEffect } from 'react';

interface MedicationNotificationProps {
  id: string;
  medicineName: string;
  dosageAmount: string;
  onClose: (id: string) => void;
  onTake: () => void;
}

export default function MedicationNotification({
  id,
  medicineName,
  dosageAmount,
  onClose,
  onTake,
}: MedicationNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const timer = setTimeout(() => {
      handleClose();
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsCollapsing(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const handleTake = () => {
    onTake();
    handleClose();
  };

  return (
    <div
      className={`med-notification ${isVisible ? 'visible' : ''} ${isCollapsing ? 'collapsing' : ''}`}
    >
      <div className="med-notification-inner">
        <div className="med-notification-icon">💊</div>
        <div className="med-notification-content">
          <div className="med-notification-title">用药提醒</div>
          <div className="med-notification-body">
            <span className="med-name">{medicineName}</span>
            {dosageAmount && (
              <span className="med-dosage">{dosageAmount}</span>
            )}
          </div>
        </div>
        <div className="med-notification-actions">
          <button
            className="take-btn"
            onClick={handleTake}
          >
            ✓ 已服用
          </button>
          <button
            className="dismiss-btn"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
      </div>
      <div className="med-notification-progress">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
}
