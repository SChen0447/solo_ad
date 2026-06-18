import React, { useState, useEffect, useRef } from 'react';
import type { LeaderboardItem } from '../types';
import { voteEngine, useLeaderboard } from '../VoteEngine';
import { categoryLabels } from '../dataStore';
import type { Category } from '../types';

interface LeaderboardProps {
  onItemClick: (creativeId: string) => void;
  category?: Category;
}

const Leaderboard: React.FC<LeaderboardProps> = function Leaderboard({
  onItemClick,
  category = 'all',
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const items = useLeaderboard(category, 10);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPositions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      itemRefs.current.forEach((el, id) => {
        const currentTop = el.offsetTop;
        const prevTop = prevPositions.current.get(id);

        if (prevTop !== undefined && prevTop !== currentTop) {
          const diff = prevTop - currentTop;
          el.style.transform = `translateY(${diff}px)`;
          el.style.transition = 'none';

          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.3s ease';
            el.style.transform = 'translateY(0)';
          });
        }

        prevPositions.current.set(id, currentTop);
      });
    });
  }, [items, refreshKey]);

  const handleItemClick = (creativeId: string) => {
    onItemClick(creativeId);
  };

  return (
    <div className="leaderboard-panel">
      <div className="leaderboard-header">
        <h2>🔥 实时排行榜</h2>
        {category !== 'all' && (
          <span className="leaderboard-category">
            {categoryLabels[category]}
          </span>
        )}
      </div>
      <div className="leaderboard-list">
        {items.map((item) => (
          <div
            key={item.creative.id}
            ref={(el) => {
              if (el) itemRefs.current.set(item.creative.id, el);
            }}
            className="leaderboard-item"
            onClick={() => handleItemClick(item.creative.id)}
          >
            <span
              className="rank-number"
              style={{ color: voteEngine.getRankColor(item.rank) }}
            >
              {item.rank}
            </span>
            <div className="item-content">
              <span className="item-title">{item.creative.title}</span>
              <span className="item-votes">
                {voteEngine.formatVoteCount(item.creative.votes)} 票
              </span>
            </div>
            <span
              className="trend-indicator"
              style={{ color: voteEngine.getTrendColor(item.trend) }}
            >
              {voteEngine.getTrendIcon(item.trend)}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="leaderboard-empty">暂无数据</div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
