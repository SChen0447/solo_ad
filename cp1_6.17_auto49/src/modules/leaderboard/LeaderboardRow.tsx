import React, { useEffect, useRef } from 'react';
import { LeaderboardEntry } from '../../types';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const prevChangeRef = useRef<string>(entry.rankChange);

  useEffect(() => {
    if (prevChangeRef.current !== 'same' && rowRef.current) {
      rowRef.current.classList.remove('flash-up', 'flash-down', 'scale-anim');
      void rowRef.current.offsetWidth;
      if (entry.rankChange === 'up') {
        rowRef.current.classList.add('flash-up', 'scale-anim');
      } else if (entry.rankChange === 'down') {
        rowRef.current.classList.add('flash-down', 'scale-anim');
      }
    }
    prevChangeRef.current = entry.rankChange;
  }, [entry.rankChange]);

  return (
    <div ref={rowRef} className="leaderboard-row">
      <span className="row-rank">
        {entry.rank === 1 && <span className="crown-icon">👑</span>}
        {entry.rank}
      </span>
      <span className="row-nickname">{entry.nickname}</span>
      <span className="row-count">{entry.giftCount} 个</span>
      <span className="row-value">{entry.totalValue} 币</span>
    </div>
  );
};
