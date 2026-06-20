import { useState, useEffect } from 'react';
import { activityApi } from '../api';
import { Activity } from '../types';
import ActivityCard from '../components/ActivityCard';

function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recruiting' | 'upcoming' | 'ended'>('all');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await activityApi.getAll();
      setActivities(data);
    } catch (error) {
      console.error('加载活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.status === filter);

  const filterButtons = [
    { key: 'all', label: '全部' },
    { key: 'recruiting', label: '招募中' },
    { key: 'upcoming', label: '即将开始' },
    { key: 'ended', label: '已结束' },
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>所有活动</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                background: filter === btn.key ? '#F59E0B' : '#F3F4F6',
                color: filter === btn.key ? 'white' : '#6B7280',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载中...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">暂无活动</p>
        </div>
      ) : (
        <div className="activity-list">
          {filteredActivities.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
