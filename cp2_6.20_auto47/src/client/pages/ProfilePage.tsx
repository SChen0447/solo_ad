import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi, activityApi } from '../api';
import { useAuthStore } from '../store';
import { User, Activity, BADGE_CONFIGS, getAuthLevelGradient } from '../types';

const RING_SIZE = 120;
const RING_STROKE_WIDTH = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAX_HOURS = 200;

export default function ProfilePage() {
  const { user, isLoggedIn, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [registeredActivities, setRegisteredActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<'registered' | 'history'>('registered');
  const [tabTransition, setTabTransition] = useState(0);
  const [progressAnimated, setProgressAnimated] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await userApi.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setUser(res.data);

        const activityRes = await activityApi.getList();
        if (activityRes.success && activityRes.data) {
          const registered = activityRes.data.filter(a =>
            res.data!.registeredActivities.includes(a.id)
          );
          setRegisteredActivities(registered);
        }

        setTimeout(() => setProgressAnimated(true), 100);
      }
    } catch (e) {
      console.error('Failed to load profile');
    }
  }, [isLoggedIn, setUser]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [isLoggedIn, navigate, loadProfile]);

  const handleTabChange = (tab: 'registered' | 'history') => {
    const direction = tab === 'history' ? -1 : 1;
    setTabTransition(direction);
    setActiveTab(tab);
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse bg-white rounded-[10px] h-64 shadow-sm" />
      </div>
    );
  }

  const progressRatio = Math.min(profile.totalHours / MAX_HOURS, 1);
  const strokeDashoffset = RING_CIRCUMFERENCE - (progressAnimated ? progressRatio * RING_CIRCUMFERENCE : 0);
  const authBorderColor = getAuthLevelGradient(profile.authLevel);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-[10px] shadow-sm p-6 mb-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.nickname}
              className="w-20 h-20 rounded-full object-cover"
              style={{
                border: `2px solid ${authBorderColor}`,
                boxShadow: `0 0 12px ${authBorderColor}40`,
              }}
            />
            {profile.badges.length > 0 && (
              <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                {profile.badges.slice(-2).map((hours) => {
                  const badge = BADGE_CONFIGS.find(b => b.hours === hours);
                  return badge ? (
                    <span key={hours} className="text-sm" title={badge.name}>{badge.icon}</span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-800">{profile.nickname}</h2>
            <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                {profile.skills.map((skill) => (
                  <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {profile.availableTime && (
              <p className="text-xs text-gray-400 mt-1">可用时间：{profile.availableTime}</p>
            )}
          </div>

          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg width={RING_SIZE} height={RING_SIZE} className="transform -rotate-90">
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#FEF3C7"
                  strokeWidth={RING_STROKE_WIDTH}
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth={RING_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: 'stroke-dashoffset 0.5s ease-out',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-amber-700">{profile.totalHours}</span>
                <span className="text-xs text-gray-400">服务时长</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {BADGE_CONFIGS.map((badge) => (
                <span
                  key={badge.hours}
                  className={`text-lg ${profile.badges.includes(badge.hours) ? 'opacity-100' : 'opacity-20'}`}
                  title={badge.name}
                >
                  {badge.icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[10px] shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleTabChange('registered')}
            className="flex-1 py-3 text-sm font-medium text-center transition-colors duration-200"
            style={{
              color: activeTab === 'registered' ? '#D97706' : '#9CA3AF',
              borderBottom: activeTab === 'registered' ? '2px solid #F59E0B' : '2px solid transparent',
            }}
          >
            已报名活动
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className="flex-1 py-3 text-sm font-medium text-center transition-colors duration-200"
            style={{
              color: activeTab === 'history' ? '#D97706' : '#9CA3AF',
              borderBottom: activeTab === 'history' ? '2px solid #F59E0B' : '2px solid transparent',
            }}
          >
            服务历史
          </button>
        </div>

        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-[250ms] ease-out"
            style={{
              transform: activeTab === 'registered' ? 'translateX(0)' : 'translateX(-100%)',
            }}
          >
            <div className="w-full shrink-0 p-4">
              {registeredActivities.length > 0 ? (
                <div className="space-y-3">
                  {registeredActivities.map((activity) => (
                    <Link
                      key={activity.id}
                      to={`/activity/${activity.id}`}
                      className="block p-3 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-800">{activity.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (activity.status === 'recruiting' ? '#22C55E' : activity.status === 'upcoming' ? '#F59E0B' : '#EF4444') + '20',
                            color: activity.status === 'recruiting' ? '#22C55E' : activity.status === 'upcoming' ? '#F59E0B' : '#EF4444',
                          }}
                        >
                          {activity.status === 'recruiting' ? '招募中' : activity.status === 'upcoming' ? '即将开始' : '已结束'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{activity.dateTime} · {activity.location}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">暂无已报名活动</div>
              )}
            </div>

            <div className="w-full shrink-0 p-4">
              {profile.serviceHistory.length > 0 ? (
                <div className="space-y-3">
                  {profile.serviceHistory.map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{record.activityName}</p>
                        <p className="text-xs text-gray-400">{record.date}</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-600">+{record.hours}h</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">暂无服务记录</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
