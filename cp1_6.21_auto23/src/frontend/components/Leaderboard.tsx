import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, VoteOption } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { formatDate } from '../utils';

type SortType = 'latest' | 'hot';

export default function Leaderboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sortType, setSortType] = useState<SortType>('latest');
  const [loading, setLoading] = useState(true);
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await api.getAllActivities();
        setActivities(data);

        const ranks = new Map<string, number>();
        data.forEach((act, index) => ranks.set(act.id, index));
        prevRanksRef.current = ranks;
      } catch (err) {
        console.error('Failed to load activities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();

    const socket = getSocket();

    const handleVoteUpdated = (data: { activityId: string; activity: Activity }) => {
      setActivities((prev) => {
        const newActivities = prev.map((act) =>
          act.id === data.activityId ? data.activity : act
        );

        const prevRanks = prevRanksRef.current;
        const newRanks = new Map<string, number>();
        const sorted = sortActivities(newActivities, sortType);
        sorted.forEach((act, index) => newRanks.set(act.id, index));

        const changedIds = new Set<string>();
        for (const [id, newRank] of newRanks) {
          const oldRank = prevRanks.get(id);
          if (oldRank !== undefined && Math.abs(oldRank - newRank) >= 1) {
            changedIds.add(id);
          }
        }

        if (changedIds.size > 0) {
          setPulsingIds(changedIds);
          setTimeout(() => setPulsingIds(new Set()), 800);
        }

        prevRanksRef.current = newRanks;
        return sortActivities(newActivities, sortType);
      });
    };

    const handleActivityCreated = (activity: Activity) => {
      setActivities((prev) => {
        const newActivities = [activity, ...prev];
        return sortActivities(newActivities, sortType);
      });
    };

    socket.on('vote:updated', handleVoteUpdated);
    socket.on('activity:created', handleActivityCreated);

    return () => {
      socket.off('vote:updated', handleVoteUpdated);
      socket.off('activity:created', handleActivityCreated);
    };
  }, [sortType]);

  const sortActivities = (acts: Activity[], sort: SortType): Activity[] => {
    const sorted = [...acts];
    if (sort === 'hot') {
      sorted.sort((a, b) => b.totalVotes - a.totalVotes);
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
  };

  const getTopOptions = (activity: Activity): VoteOption[] => {
    return [...activity.options]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 3);
  };

  const sortedActivities = sortActivities(activities, sortType);

  if (loading) {
    return (
      <div className="page leaderboard-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="page leaderboard-page">
      <div className="page-header">
        <h1>实时排名看板</h1>
        <p>查看所有进行中的创意投票活动</p>
      </div>

      <div className="sort-tabs">
        <button
          className={`sort-tab ${sortType === 'latest' ? 'active' : ''}`}
          onClick={() => setSortType('latest')}
        >
          🆕 最新
        </button>
        <button
          className={`sort-tab ${sortType === 'hot' ? 'active' : ''}`}
          onClick={() => setSortType('hot')}
        >
          🔥 热度
        </button>
      </div>

      <div className="activities-list">
        {sortedActivities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>暂无投票活动</h3>
            <p>点击上方"创建活动"来发起第一个投票吧！</p>
            <Link to="/create" className="primary-btn">
              创建活动
            </Link>
          </div>
        ) : (
          sortedActivities.map((activity, index) => {
            const topOptions = getTopOptions(activity);
            const maxVotes = Math.max(...activity.options.map((o) => o.votes), 1);
            const isPulsing = pulsingIds.has(activity.id);

            return (
              <Link
                key={activity.id}
                to={`/activity/${activity.id}`}
                className={`activity-card ${isPulsing ? 'pulsing' : ''}`}
                style={{
                  transitionDelay: `${index * 30}ms`,
                }}
              >
                <div className="card-rank">
                  <span className="card-rank-number">{index + 1}</span>
                </div>

                <div className="card-content">
                  <div className="card-header">
                    <h3 className="card-title">{activity.title}</h3>
                    <span className="card-votes">
                      {activity.totalVotes} 票
                    </span>
                  </div>

                  <div className="card-top-options">
                    {topOptions.map((option, optIndex) => {
                      const percentage = activity.totalVotes > 0
                        ? (option.votes / activity.totalVotes) * 100
                        : 0;

                      return (
                        <div
                          key={option.id}
                          className={`mini-option rank-${optIndex + 1}`}
                        >
                          <span className="mini-option-rank">{optIndex + 1}</span>
                          <span className="mini-option-text">
                            {option.text}
                          </span>
                          <span className="mini-option-votes">
                            {option.votes}票
                          </span>
                          <div className="mini-progress-container">
                            <div
                              className={`mini-progress-bar ${optIndex === 0 ? 'first' : ''}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="card-footer">
                    <span className="card-date">
                      {formatDate(activity.createdAt)}
                    </span>
                    <span className="card-option-count">
                      {activity.options.length} 个选项
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
