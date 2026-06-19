import React, { useState, useEffect } from 'react';
import { Stats } from '../types';

interface SidebarProps {
  onTagClick?: (tagId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onTagClick }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTagFontSize = (count: number, maxCount: number): string => {
    if (maxCount === 0) return '14px';
    const ratio = count / maxCount;
    const size = 14 + ratio * 16;
    return `${size}px`;
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const maxTagCount = stats ? Math.max(...stats.hotTags.map(t => t.count)) : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <h3 className="sidebar__title">🔥 热门话题</h3>
        {loading ? (
          <div className="sidebar__loading">加载中...</div>
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
              >
                {tag.name}
                <span className="tag-cloud__count">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__title">👥 活跃用户</h3>
        {loading ? (
          <div className="sidebar__loading">加载中...</div>
        ) : (
          <div className="sidebar__user-list">
            {stats?.activeUsers.map((user, index) => (
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
                <div className="user-item__score">
                  {user.total}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
