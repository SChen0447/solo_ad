import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityApi, userApi } from '../api';
import { useAuthStore } from '../store';
import { Activity, getStatusColor, getStatusText } from '../types';

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn, updateUserHours, showBadges } = useAuthStore();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadActivity();
  }, [id]);

  const loadActivity = async () => {
    if (!id) return;
    try {
      const res = await activityApi.getDetail(id);
      if (res.success && res.data) {
        setActivity(res.data);
      }
    } catch (e) {
      console.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const isRegistered = activity && user
    ? activity.participants.includes(user.id)
    : false;

  const isCheckedIn = activity && user
    ? activity.checkedIn.includes(user.id)
    : false;

  const isActivityToday = activity
    ? new Date(activity.dateTime).toDateString() === new Date().toDateString()
    : false;

  const handleRegister = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!activity) return;

    setBtnPressed(true);
    setTimeout(() => setBtnPressed(false), 150);

    setRegistering(true);
    try {
      const res = await activityApi.register(activity.id);
      if (res.success) {
        setMessage('报名成功！');
        loadActivity();
      } else {
        setMessage(res.message || '报名失败');
      }
    } catch (e) {
      setMessage('网络错误');
    } finally {
      setRegistering(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCheckin = async () => {
    if (!isLoggedIn || !activity) return;

    setCheckingIn(true);
    try {
      const res = await activityApi.checkin(activity.id);
      if (res.success && res.data) {
        setMessage(`签到成功！本次获得 ${res.data.hours} 小时服务时长`);
        updateUserHours(res.data.totalHours, res.data.authLevel, user?.badges || []);
        loadActivity();

        if (res.data.newBadges && res.data.newBadges.length > 0) {
          setTimeout(() => {
            showBadges(res.data.newBadges!);
          }, 800);
        }
      } else {
        setMessage(res.message || '签到失败');
      }
    } catch (e) {
      setMessage('网络错误');
    } finally {
      setCheckingIn(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse bg-white rounded-[10px] h-96 shadow-sm" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-400">
        活动不存在
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-[10px] shadow-sm overflow-hidden animate-fade-up">
        <div
          className="h-2"
          style={{ backgroundColor: getStatusColor(activity.status) }}
        />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">{activity.name}</h1>
            <span
              className="text-xs px-3 py-1 rounded-full font-medium shrink-0 ml-3"
              style={{
                backgroundColor: getStatusColor(activity.status) + '20',
                color: getStatusColor(activity.status),
              }}
            >
              {getStatusText(activity.status)}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{activity.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{activity.dateTime}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>{activity.participants.length}/{activity.maxParticipants} 人已报名</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">活动描述</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{activity.description}</p>
          </div>

          {activity.skillRequirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">技能要求</h3>
              <div className="flex flex-wrap gap-2">
                {activity.skillRequirements.map((skill) => (
                  <span key={skill} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activity.participants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">已报名志愿者</h3>
              <div className="flex flex-wrap gap-2">
                {activity.participants.map((pid) => (
                  <span key={pid} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">
                    志愿者{pid}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            {activity.status === 'ended' ? (
              <span className="text-sm text-gray-400">活动已结束</span>
            ) : isRegistered ? (
              <>
                <span className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                  已报名
                </span>
                {isActivityToday && !isCheckedIn && (
                  <button
                    onClick={handleCheckin}
                    disabled={checkingIn}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors animate-pulse-green"
                  >
                    {checkingIn ? '签到中...' : '签到'}
                  </button>
                )}
                {isCheckedIn && (
                  <span className="px-4 py-2.5 text-sm text-green-600 font-medium">✓ 已签到</span>
                )}
              </>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-transform duration-150"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  transform: btnPressed ? 'scale(0.95)' : 'scale(1)',
                  borderRadius: '8px',
                }}
              >
                {registering ? '报名中...' : '报名'}
              </button>
            )}

            {!isLoggedIn && activity.status !== 'ended' && (
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  borderRadius: '8px',
                }}
              >
                登录后报名
              </button>
            )}
          </div>

          {message && (
            <div className="mt-3 px-4 py-2 rounded-lg text-sm bg-amber-50 text-amber-700 animate-fade-up">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
