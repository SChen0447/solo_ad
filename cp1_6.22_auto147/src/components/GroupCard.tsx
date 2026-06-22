import { useNavigate } from 'react-router-dom';
import type { Group } from '../types';

interface Props {
  group: Group;
}

const TrophyGold = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#fbbf24">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

const TrophySilver = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#d1d5db">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

const TrophyBronze = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#d97706">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export default function GroupCard({ group }: Props) {
  const navigate = useNavigate();
  const top3 = group.leaderboard?.slice(0, 3) || [];

  return (
    <div
      className="group-card"
      onClick={() => navigate(`/group/${group.id}`)}
    >
      <div className="group-card-header">
        <h3 className="group-name">{group.name}</h3>
        <span className="member-badge">{group.memberCount} 人</span>
      </div>
      <p className="group-goal">🎯 {group.goal}</p>
      <div className="leaderboard">
        <div className="leaderboard-title">排行榜</div>
        <div className="leaderboard-list">
          {top3.length === 0 && <div className="empty">暂无数据</div>}
          {top3.map((entry, i) => (
            <div key={entry.userId} className="leaderboard-item">
              <div className="rank">
                {i === 0 && <TrophyGold />}
                {i === 1 && <TrophySilver />}
                {i === 2 && <TrophyBronze />}
                <span className="rank-num">{i + 1}</span>
              </div>
              <img src={entry.avatar} alt={entry.name} className="mini-avatar" />
              <span className="lb-name">{entry.name}</span>
              <span className="lb-points">{entry.points}分</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
