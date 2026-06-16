import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LeaderboardEntry } from '../../types';
import { LeaderboardRow } from './LeaderboardRow';
import { on, off } from '../../utils/socket';

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [prevRanks, setPrevRanks] = useState<Map<string, number>>(new Map());

  const handleUpdate = useCallback(
    (data: LeaderboardEntry[]) => {
      setEntries((prev) => {
        const newPrevRanks = new Map(prevRanks);
        prev.forEach((e) => newPrevRanks.set(e.nickname, e.rank));

        const updated = data.map((entry) => {
          const oldRank = newPrevRanks.get(entry.nickname);
          let rankChange: 'up' | 'down' | 'same' = 'same';
          if (oldRank !== undefined) {
            if (entry.rank < oldRank) rankChange = 'up';
            else if (entry.rank > oldRank) rankChange = 'down';
          }
          return { ...entry, rankChange };
        });

        setPrevRanks(newPrevRanks);
        return updated;
      });
    },
    [prevRanks]
  );

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const data = args[0] as LeaderboardEntry[];
      if (Array.isArray(data)) {
        handleUpdate(data);
      }
    };
    on('leaderboard_update', handler);
    return () => {
      off('leaderboard_update', handler);
    };
  }, [handleUpdate]);

  const topEntries = useMemo(
    () => entries.slice(0, 10),
    [entries]
  );

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="header-rank">排名</span>
        <span className="header-nickname">昵称</span>
        <span className="header-count">礼物数</span>
        <span className="header-value">总价值</span>
      </div>
      <div className="leaderboard-body">
        {topEntries.map((entry) => (
          <LeaderboardRow key={entry.nickname} entry={entry} />
        ))}
        {topEntries.length === 0 && (
          <div className="leaderboard-empty">暂无排行数据</div>
        )}
      </div>
    </div>
  );
};
