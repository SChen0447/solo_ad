import React from 'react';
import { Users } from 'lucide-react';

interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  coverUrl: string;
  startTime: string;
  endTime: string;
  description: string;
  maxMembers: number;
  status: 'recruiting' | 'ongoing' | 'ended';
  members: string[];
}

interface BookClubCardProps {
  club: BookClub;
  onClick?: () => void;
  onJoin?: () => void;
  isMember?: boolean;
  isPending?: boolean;
}

const statusMap = {
  recruiting: '招募中',
  ongoing: '进行中',
  ended: '已结束'
};

const BookClubCard: React.FC<BookClubCardProps> = ({ 
  club, 
  onClick, 
  onJoin,
  isMember = false,
  isPending = false
}) => {
  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin) onJoin();
  };

  return (
    <div className="club-card" onClick={onClick}>
      <img 
        src={club.coverUrl} 
        alt={club.name}
        className="club-card-thumb"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${club.id}/200/200`;
        }}
      />
      <div className="club-card-info">
        <div className="club-card-name">{club.name}</div>
        <div className="club-card-meta">
          <span>📚 {club.bookTitle}</span>
          <span><Users size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{club.members.length}/{club.maxMembers}</span>
        </div>
      </div>
      <span className={`club-card-status ${club.status}`}>
        {statusMap[club.status]}
      </span>
      {!isMember && !isPending && club.status === 'recruiting' && (
        <button 
          className="btn btn-primary"
          onClick={handleJoin}
          style={{ marginLeft: '12px' }}
        >
          申请加入
        </button>
      )}
      {isPending && (
        <span className="pending-badge">审核中</span>
      )}
      {isMember && (
        <span style={{ color: '#4CAF50', fontSize: '14px' }}>已加入</span>
      )}
    </div>
  );
};

export default BookClubCard;
