import { useEffect, useState } from 'react';
import type { Member } from '../types';
import { LEVEL_COLORS, LEVEL_NAMES, LEVEL_THRESHOLDS } from '../types';

interface MemberPanelProps {
  member: Member;
  onLogout: () => void;
}

function MemberPanel({ member, onLogout }: MemberPanelProps) {
  const [showProgress, setShowProgress] = useState(false);
  const levelColor = LEVEL_COLORS[member.level];
  const levelName = LEVEL_NAMES[member.level];

  const currentLevelIndex = LEVEL_THRESHOLDS.findIndex(t => t.level === member.level);
  const nextLevel = LEVEL_THRESHOLDS[currentLevelIndex + 1];
  const currentThreshold = LEVEL_THRESHOLDS[currentLevelIndex];

  let progressPercent = 100;
  if (nextLevel) {
    const levelProgress = member.totalSpent - currentThreshold.min;
    const levelRange = nextLevel.min - currentThreshold.min;
    progressPercent = Math.min(100, Math.max(0, (levelProgress / levelRange) * 100));
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowProgress(true), 100);
    return () => clearTimeout(timer);
  }, [member.totalSpent]);

  const firstLetter = member.nickname.charAt(0).toUpperCase();

  return (
    <div className="member-panel">
      <div className="member-info">
        <div className="avatar-container">
          <div
            className="member-avatar"
            style={{ borderColor: levelColor }}
          >
            {firstLetter}
          </div>
          <span
            className="level-badge"
            style={{ backgroundColor: levelColor }}
          />
        </div>
        <div className="member-details">
          <div className="member-name">{member.nickname}</div>
          <div className="member-level" style={{ color: levelColor }}>
            {levelName}
          </div>
        </div>
      </div>
      <div className="member-stats">
        <div className="stat-row">
          <span className="stat-label">累计消费</span>
          <span className="stat-value">¥{member.totalSpent}</span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{
              height: showProgress ? `${progressPercent}%` : '0%',
              background: levelColor,
            }}
          />
          {nextLevel && (
            <div className="progress-label">
              距离 {LEVEL_NAMES[nextLevel.level]} 还差 ¥{nextLevel.min - member.totalSpent}
            </div>
          )}
        </div>
        <div className="stat-row">
          <span className="stat-label">积分</span>
          <span className="stat-value points">{member.points}</span>
        </div>
      </div>
      <button className="logout-btn" onClick={onLogout}>
        退出登录
      </button>
    </div>
  );
}

export default MemberPanel;
