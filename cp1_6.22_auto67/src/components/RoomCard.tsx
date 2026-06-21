import React from 'react';

export interface RoomCardProps {
  id: string;
  name: string;
  eventDate: string;
  exchangeDeadline: string;
  status: 'pending' | 'active' | 'completed';
  participantCount: number;
  onClick?: () => void;
}

function getDaysLeft(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusText(status: string): string {
  switch (status) {
    case 'active':
      return '进行中';
    case 'completed':
      return '已结束';
    default:
      return '待开始';
  }
}

const RoomCard: React.FC<RoomCardProps> = ({
  name,
  eventDate,
  exchangeDeadline,
  status,
  participantCount,
  onClick,
}) => {
  const daysLeft = getDaysLeft(exchangeDeadline);

  return (
    <div className="room-card" onClick={onClick}>
      <div className="room-card-name">{name}</div>
      <div className="room-card-info">
        <div>活动时间: {new Date(eventDate).toLocaleDateString('zh-CN')}</div>
        <div>已参与人数: {participantCount} 人</div>
      </div>
      <div className="room-card-meta">
        <span className={`room-card-status status-${status}`}>
          {getStatusText(status)}
        </span>
        <span className="days-left">
          {daysLeft > 0 ? `剩余 ${daysLeft} 天` : daysLeft === 0 ? '今天截止' : '已截止'}
        </span>
      </div>
    </div>
  );
};

export default RoomCard;
