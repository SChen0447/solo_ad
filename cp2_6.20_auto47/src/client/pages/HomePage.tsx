import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { activityApi } from '../api';
import { Activity, getStatusColor, getStatusText } from '../types';

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Activity['status']>('all');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const res = await activityApi.getList();
      if (res.success && res.data) {
        setActivities(res.data);
      }
    } catch (e) {
      console.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.status === filter);

  const statusFilters: { key: 'all' | Activity['status']; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'recruiting', label: '招募中' },
    { key: 'upcoming', label: '即将开始' },
    { key: 'ended', label: '已结束' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">社区志愿活动</h1>
        <p className="text-gray-500 text-sm">发现志愿机会，贡献你的力量</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {statusFilters.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setFilter(sf.key)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
            style={{
              background: filter === sf.key ? '#F59E0B' : '#FEF3C7',
              color: filter === sf.key ? '#fff' : '#92400E',
            }}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-[10px] h-48 shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity, index) => (
            <Link
              to={`/activity/${activity.id}`}
              key={activity.id}
              className="animate-fade-up bg-white rounded-[10px] shadow-sm overflow-hidden group cursor-pointer transition-all duration-200 hover:-translate-y-[5px] hover:shadow-lg"
              style={{
                width: '300px',
                maxWidth: '100%',
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div className="relative flex">
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{
                    backgroundColor: getStatusColor(activity.status),
                    width: '4px',
                  }}
                />
                <div className="pl-4 pr-3 pt-4 pb-4 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight flex-1 mr-2">
                      {activity.name}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{
                        backgroundColor: getStatusColor(activity.status) + '20',
                        color: getStatusColor(activity.status),
                      }}
                    >
                      {getStatusText(activity.status)}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {activity.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {activity.dateTime}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {activity.participants.length}/{activity.maxParticipants} 人
                    </div>
                  </div>
                  {activity.skillRequirements.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {activity.skillRequirements.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filteredActivities.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无活动</p>
        </div>
      )}
    </div>
  );
}
