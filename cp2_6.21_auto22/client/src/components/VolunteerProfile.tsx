import React, { useEffect, useRef, useState } from 'react';
import type { Volunteer, GreenEvent, Tree } from '../types';

interface VolunteerProfileProps {
  volunteer: Volunteer;
  events: GreenEvent[];
  trees: Tree[];
  allVolunteers: Volunteer[];
  onTreeClick: (treeId: string) => void;
}

const GoldCrown: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 16L3 8L8 11L12 5L16 11L21 8L19 16H5Z"
      fill="url(#goldGradient)"
      stroke="#DAA520"
      strokeWidth="1"
    />
    <rect x="4" y="17" width="16" height="3" rx="1" fill="url(#goldGradient)" stroke="#DAA520" strokeWidth="1" />
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFE55C" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#DAA520" />
      </linearGradient>
    </defs>
  </svg>
);

const ProgressRing: React.FC<{ value: number; max: number; size?: number }> = ({
  value,
  max,
  size = 100,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(animatedValue / max, 1);
  const offset = circumference * (1 - progress);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#81C784" />
          </linearGradient>
        </defs>
      </svg>
      <div className="progress-ring-text">
        <div className="progress-ring-value">{animatedValue}h</div>
        <div className="progress-ring-label">服务时长</div>
      </div>
    </div>
  );
};

const VolunteerProfile: React.FC<VolunteerProfileProps> = ({
  volunteer,
  events,
  trees,
  allVolunteers,
  onTreeClick,
}) => {
  const sortedVolunteers = [...allVolunteers].sort((a, b) => b.serviceHours - a.serviceHours);
  const top5 = sortedVolunteers.slice(0, 5);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getInitial = (name: string) => name.charAt(0);

  const maxHours = Math.max(...allVolunteers.map(v => v.serviceHours), 40);

  return (
    <div className="page">
      <h1 className="page-title">个人中心</h1>
      <div className="profile-layout">
        <div>
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">{getInitial(volunteer.name)}</div>
              <div style={{ flex: 1 }}>
                <h2 className="profile-name">{volunteer.name}</h2>
                <p className="profile-hours-text">
                  已参与 {events.length} 个活动 · 认养 {trees.length} 棵树
                </p>
              </div>
              <ProgressRing value={volunteer.serviceHours} max={maxHours} />
            </div>
          </div>

          <div className="profile-card">
            <h3 className="section-title">参与的活动</h3>
            {sortedEvents.length === 0 ? (
              <div className="empty">暂无活动记录</div>
            ) : (
              <ul className="event-list">
                {sortedEvents.map(event => (
                  <li key={event.id}>
                    <span className="event-list-dot" />
                    <div className="event-list-info">
                      <div className="event-list-name">{event.name}</div>
                      <div className="event-list-date">{event.date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="profile-card">
            <h3 className="section-title">我的树木</h3>
            {trees.length === 0 ? (
              <div className="empty">暂未认养树木</div>
            ) : (
              <div className="trees-grid">
                {trees.map(tree => (
                  <div
                    key={tree.id}
                    className="tree-thumb"
                    style={{ background: tree.speciesColor || '#BDBDBD' }}
                    onClick={() => onTreeClick(tree.id)}
                    title={tree.name}
                  >
                    {tree.name.slice(0, 4)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="leaderboard-card">
            <h3 className="section-title">🏆 服务时长排行榜</h3>
            {top5.map((v, index) => (
              <div key={v.id} className={`leaderboard-item ${index === 0 ? 'rank-1-item' : ''}`}>
                <span className={`leaderboard-rank rank-${index + 1}`}>
                  {index === 0 ? (
                    <span className="leaderboard-crown"><GoldCrown size={22} /></span>
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="leaderboard-avatar">{getInitial(v.name)}</div>
                <div className="leaderboard-info">
                  <div className="leaderboard-name">{v.name}</div>
                  <div className="leaderboard-hours">{v.serviceHours} 小时</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerProfile;
