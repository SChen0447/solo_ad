import { Activity } from '../types';
import { useNavigate } from 'react-router-dom';

interface ActivityCardProps {
  activity: Activity;
  index?: number;
}

function ActivityCard({ activity, index }: ActivityCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recruiting': return '招募中';
      case 'upcoming': return '即将开始';
      case 'ended': return '已结束';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recruiting': return '#10B981';
      case 'upcoming': return '#F59E0B';
      case 'ended': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const handleClick = () => {
    navigate(`/activity/${activity.id}`);
  };

  const animationDelay = index ? `${0.05 * index}s` : '0s';

  return (
    <div 
      className="activity-card" 
      onClick={handleClick}
      style={{ animationDelay }}
    >
      <div 
        className="activity-card-bar" 
        style={{ backgroundColor: getStatusColor(activity.status) }}
      ></div>
      <div className="activity-card-content">
        <h3 className="activity-card-title">{activity.name}</h3>
        <div className="activity-card-info">
          <div className="activity-card-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{activity.location}</span>
          </div>
          <div className="activity-card-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formatDate(activity.dateTime)}</span>
          </div>
        </div>
        <div className="activity-card-footer">
          <span className={`activity-card-status ${activity.status}`}>
            {getStatusText(activity.status)}
          </span>
          <span className="activity-card-spots">
            <strong>{activity.registeredCount || 0}</strong>/{activity.maxVolunteers}人
          </span>
        </div>
      </div>
    </div>
  );
}

export default ActivityCard;
