import React from 'react';
import type { Achievement } from '../types';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  currentProgress: number;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  unlocked,
  currentProgress,
}) => {
  return (
    <div
      className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}
      style={{ backgroundColor: unlocked ? achievement.color : '#ccc' }}
    >
      <span>{achievement.icon}</span>
      <div className="achievement-tooltip">
        <strong>{achievement.name}</strong>
        <div style={{ marginTop: '4px' }}>
          {unlocked
            ? achievement.description
            : `${achievement.description} (${currentProgress}/${achievement.requirement})`}
        </div>
      </div>
    </div>
  );
};

export default AchievementBadge;
