import React from 'react';
import { Team } from '../types';

interface MatchCardProps {
  team: Team;
  onJoin: (teamId: string) => void;
  index: number;
}

const MatchCard: React.FC<MatchCardProps> = ({ team, onJoin, index }) => {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <div className="match-card" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="card-header">
        <h3 className="card-title">{team.name}</h3>
        <span className="member-count">
          {team.members.length}/{team.maxMembers}
        </span>
      </div>

      <div className="card-tags">
        {team.tags.map((tag, i) => (
          <span key={i} className="tag">#{tag}</span>
        ))}
      </div>

      <div className="card-members">
        <div className="member-avatars">
          {team.members.slice(0, 4).map((member, i) => (
            <div
              key={member.id}
              className="avatar"
              style={{ marginLeft: i > 0 ? '-8px' : '0' }}
              title={member.nickname}
            >
              {member.nickname.charAt(0)}
            </div>
          ))}
          {team.members.length > 4 && (
            <div className="avatar avatar-more" style={{ marginLeft: '-8px' }}>
              +{team.members.length - 4}
            </div>
          )}
        </div>
      </div>

      <div className="card-footer">
        <span className="create-time">{formatTime(team.createdAt)}</span>
        <button
          className="btn btn-primary"
          onClick={() => onJoin(team.id)}
          disabled={team.members.length >= team.maxMembers}
        >
          {team.members.length >= team.maxMembers ? '已满' : '加入'}
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
