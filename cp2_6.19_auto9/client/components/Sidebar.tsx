import React, { useState, useEffect, useCallback } from 'react';
import { Stats } from '../types';

interface SidebarProps {
  onTagClick?: (tagId: string) => void;
  refreshKey?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ onTagClick, refreshKey }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const getTagFontSize = (count: number, maxCount: number): string => {
    if (maxCount === 0) return '14px';
    const ratio = count / maxCount;
    const size = 14 + ratio * 14;
    return `${size}px`;
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const maxTagCount = stats ? Math.max(...stats.hotTags.map(t => t.count), 1) : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <h3 className="sidebar__title">🔥 热门话题</h3>
          <button 
            className="sidebar__refresh-btn"
            onClick={fetchStats}
            disabled={loading}
            title="刷新数据"
          >
            🔄
          </button>
        </div>
        {loading ? (
          <div className="sidebar__loading">加载中...</div>
        ) : error ? (
          <div className="sidebar__error">
            <p>{error}</p>
            <button onClick={fetchStats} className="sidebar__retry-btn">
              重试
            </button>
          </div>
        ) : (
          <div className="sidebar__tag-cloud">
            {stats?.hotTags.map(({ tag, count }) => (
              <button
                key={tag.id}
                className="tag-cloud__item"
                style={{
                  fontSize: getTagFontSize(count, maxTagCount),
                  color: tag.color
                }}
                onClick={() => onTagClick?.(tag.id)}
                title={`${tag.name} (${count}篇)`}
              >
                {tag.name}
                <span className="tag-cloud__count">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <h3 className="sidebar__title">👥 活跃用户</h3>
          <span className="sidebar__subtitle">本周排行</span>
        </div>
        {loading ? (
          <div className="sidebar__loading">加载中...</div>
        ) : error ? (
          <div className="sidebar__error">
            <p>{error}</p>
          </div>
        ) : stats?.activeUsers && stats.activeUsers.length > 0 ? (
          <div className="sidebar__user-list">
            {stats.activeUsers.map((user, index) => (
              <div key={user.name} className="user-item">
                <div className="user-item__rank">
                  {index < 3 ? (
                    <span className={`user-item__rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  ) : (
                    <span className="user-item__rank-num">{index + 1}</span>
                  )}
                </div>
                <div 
                  className="user-item__avatar"
                  style={{ backgroundColor: user.avatar }}
                >
                  {getInitial(user.name)}
                </div>
                <div className="user-item__info">
                  <span className="user-item__name">{user.name}</span>
                  <span className="user-item__stats">
                    {user.posts} 帖 · {user.comments} 评论
                  </span>
                </div>
                <div className="user-item__score" title="总活跃度">
                  {user.total}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sidebar__empty">暂无数据</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
