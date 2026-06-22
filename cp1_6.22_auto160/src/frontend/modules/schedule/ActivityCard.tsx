import { useState } from 'react';
import { Activity } from '../../types';
import { useUser } from '../../context/UserContext';
import './ActivityCard.css';

interface ActivityCardProps {
  activity: Activity;
  onClick: () => void;
  index?: number;
}

const typeLabels: Record<string, string> = {
  talk: '演讲',
  workshop: '工作坊',
  social: '社交'
};

const difficultyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
};

export default function ActivityCard({ activity, onClick, index = 0 }: ActivityCardProps) {
  const { bookedActivities, handleBookActivity, handleUnbookActivity } = useUser();
  const [isBooked, setIsBooked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isAlreadyBooked = bookedActivities.some(a => a.id === activity.id);
  const isFull = activity.registered >= activity.capacity;
  const capacityPercent = Math.round((activity.registered / activity.capacity) * 100);

  const handleBookClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFull || isAlreadyBooked) return;
    
    const result = await handleBookActivity(activity.id);
    if (result.success) {
      setIsBooked(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleUnbookClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleUnbookActivity(activity.id);
    setIsBooked(false);
  };

  const animationDelay = `${index * 0.05}s`;

  return (
    <div
      className={`activity-card ${isAlreadyBooked ? 'booked' : ''}`}
      style={{ animationDelay }}
      onClick={onClick}
    >
      {(isAlreadyBooked || isBooked) && (
        <div className={`booked-check ${isAnimating ? 'animate' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <div className={`card-type-badge ${activity.type}`}>
        {typeLabels[activity.type]}
      </div>

      <h3 className="card-title">{activity.title}</h3>

      <div className="card-time">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {activity.startTime} - {activity.endTime}
      </div>

      <div className="card-speaker">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {activity.speaker}
      </div>

      <div className="card-location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {activity.location}
      </div>

      <div className="card-difficulty">
        <span className={`difficulty-dot ${activity.difficulty}`} />
        <span className="difficulty-text">{difficultyLabels[activity.difficulty]}</span>
      </div>

      <div className="card-tags">
        {activity.tags.slice(0, 2).map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      <div className="card-footer">
        <span className={`capacity-info ${isFull ? 'full' : ''}`}>
          {isFull ? '已满员' : `${activity.registered}/${activity.capacity}人 (${capacityPercent}%)`}
        </span>
        {isAlreadyBooked ? (
          <button className="book-btn booked" onClick={handleUnbookClick}>
            已预约
          </button>
        ) : (
          <button
            className="book-btn"
            onClick={handleBookClick}
            disabled={isFull}
          >
            {isFull ? '已满' : '预约'}
          </button>
        )}
      </div>
    </div>
  );
}
