import { useEffect, useState } from 'react';

interface BadgeModalProps {
  isOpen: boolean;
  badgeType: string | null;
  hours: number;
  onClose: () => void;
}

function BadgeModal({ isOpen, badgeType, hours, onClose }: BadgeModalProps) {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimateIn(false);
      const timer = setTimeout(() => {
        setAnimateIn(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !badgeType) return null;

  const badgeInfo: Record<string, { icon: string; title: string; color: string }> = {
    bronze: { icon: '🥉', title: '铜质徽章', color: '#CD7F32' },
    silver: { icon: '🥈', title: '银质徽章', color: '#C0C0C0' },
    gold: { icon: '🥇', title: '金质徽章', color: '#FFD700' },
  };

  const badge = badgeInfo[badgeType] || badgeInfo.bronze;

  return (
    <div className="badge-modal-overlay" onClick={onClose}>
      <div 
        className={`badge-modal ${animateIn ? 'animate-in' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="badge-modal-icon">{badge.icon}</div>
        <h2 className="badge-modal-title">恭喜解锁新徽章！</h2>
        <p className="badge-modal-desc">
          您已累计服务 <strong style={{ color: badge.color }}>{hours}</strong> 小时，
          <br />获得「{badge.title}」表彰
        </p>
        <button className="btn btn-primary" onClick={onClose}>
          太棒了！
        </button>
      </div>
    </div>
  );
}

export default BadgeModal;
