import React, { useEffect, useState, useCallback, useRef } from 'react';

export interface LeaderboardItem {
  id: string;
  name: string;
  ownerNickname: string;
  likesCount: number;
  commentsCount: number;
  interactionCount: number;
}

const Leaderboard: React.FC = () => {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardItem[]> => {
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (cancelledRef.current || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await fetchLeaderboard();
      if (!cancelledRef.current) {
        setItems(prev => {
          if (
            prev.length === data.length &&
            prev.every((item, i) => {
              const d = data[i];
              return (
                d &&
                item.id === d.id &&
                item.interactionCount === d.interactionCount &&
                item.likesCount === d.likesCount &&
                item.commentsCount === d.commentsCount
              );
            })
          ) {
            return prev;
          }
          return data;
        });
      }
    } finally {
      if (!cancelledRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchLeaderboard, isRefreshing]);

  useEffect(() => {
    cancelledRef.current = false;
    refreshData();
    timerRef.current = setInterval(refreshData, 10000);

    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [refreshData]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <span className="rank-badge gold">🥇</span>;
      case 1:
        return <span className="rank-badge silver">🥈</span>;
      case 2:
        return <span className="rank-badge bronze">🥉</span>;
      default:
        return <span className="rank-badge">{index + 1}</span>;
    }
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="leaderboard-title">
          <span className="flame-icon">🔥</span>
          实时热度榜
        </span>
        <button
          className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={refreshData}
          disabled={isRefreshing}
          title="刷新"
        >
          ↻
        </button>
      </div>
      <div className="leaderboard-list">
        {items.length === 0 ? (
          <div className="leaderboard-empty">暂无数据</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="leaderboard-item">
              {getRankBadge(index)}
              <div className="leaderboard-info">
                <div className="leaderboard-name">{item.name}</div>
                <div className="leaderboard-owner">{item.ownerNickname}</div>
              </div>
              <div className="leaderboard-count">
                <span className="count-number">{item.interactionCount}</span>
                <span className="count-label">互动</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
