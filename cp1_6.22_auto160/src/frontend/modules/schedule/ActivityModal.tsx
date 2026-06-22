import { useEffect } from 'react';
import { Activity } from '../../types';
import { useUser } from '../../context/UserContext';
import './ActivityModal.css';

interface ActivityModalProps {
  activity: Activity | null;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  talk: '演讲',
  workshop: '工作坊',
  social: '社交活动'
};

const difficultyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
};

export default function ActivityModal({ activity, onClose }: ActivityModalProps) {
  const { bookedActivities, handleBookActivity, handleUnbookActivity } = useUser();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (activity) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [activity, onClose]);

  if (!activity) return null;

  const isBooked = bookedActivities.some(a => a.id === activity.id);
  const isFull = activity.registered >= activity.capacity;
  const capacityPercent = Math.round((activity.registered / activity.capacity) * 100);

  const handleBook = async () => {
    if (isFull || isBooked) return;
    await handleBookActivity(activity.id);
  };

  const handleUnbook = async () => {
    await handleUnbookActivity(activity.id);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          <span className={`modal-type ${activity.type}`}>
            {typeLabels[activity.type]}
          </span>
          <h2 className="modal-title">{activity.title}</h2>
          <div className="modal-difficulty">
            <span className={`difficulty-dot ${activity.difficulty}`} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              {difficultyLabels[activity.difficulty]}
            </span>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-info-grid">
            <div className="modal-info-item">
              <span className="modal-info-label">开始时间</span>
              <span className="modal-info-value highlight">{activity.startTime}</span>
            </div>
            <div className="modal-info-item">
              <span className="modal-info-label">结束时间</span>
              <span className="modal-info-value highlight">{activity.endTime}</span>
            </div>
            <div className="modal-info-item">
              <span className="modal-info-label">主讲人</span>
              <span className="modal-info-value">{activity.speaker}</span>
            </div>
            <div className="modal-info-item">
              <span className="modal-info-label">地点</span>
              <span className="modal-info-value">{activity.location}</span>
            </div>
          </div>

          <p className="modal-description">{activity.description}</p>

          <div className="modal-info-item" style={{ marginBottom: '16px' }}>
            <span className="modal-info-label">活动标签</span>
          </div>
          <div className="modal-tags">
            {activity.tags.map(tag => (
              <span key={tag} className="modal-tag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-capacity">
            <div>名额剩余: {activity.capacity - activity.registered} / {activity.capacity}</div>
            <div className="modal-capacity-bar">
              <div
                className={`modal-capacity-fill ${isFull ? 'full' : ''}`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
          {isBooked ? (
            <button className="modal-book-btn booked" onClick={handleUnbook}>
              取消预约
            </button>
          ) : (
            <button
              className="modal-book-btn"
              onClick={handleBook}
              disabled={isFull}
            >
              {isFull ? '已满员' : '立即预约'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
