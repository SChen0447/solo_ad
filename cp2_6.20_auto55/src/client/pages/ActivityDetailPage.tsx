import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Activity } from '../api';
import { useAuth, AUTH_LEVEL_COLORS } from '../App';

const STATUS_INFO: Record<string, { text: string; color: string; bg: string }> = {
  recruiting: { text: '招募中', color: '#15803D', bg: '#DCFCE7' },
  upcoming: { text: '即将开始', color: '#92400E', bg: '#FEF3C7' },
  ended: { text: '已结束', color: '#B91C1C', bg: '#FEE2E2' },
};

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setUser, triggerBadge } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getActivity(id)
      .then(setActivity)
      .catch(err => {
        setMsg({ type: 'err', text: err.message || '加载失败' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const isRegistered = user && activity?.registeredUsers.includes(user.id);
  const isCheckedIn = user && activity?.checkedInUsers.includes(user.id);
  const isToday = activity?.dateTime.split(' ')[0] === '2026-06-20';

  const handleRegister = async () => {
    if (!user) { navigate('/login'); return; }
    if (!activity) return;
    setActionLoading(true);
    try {
      await api.registerActivity(activity.id, user.id);
      await api.updateUserActivity(user.id, { activityId: activity.id, action: 'register' });
      const [act, u] = await Promise.all([api.getActivity(activity.id), api.getUser(user.id)]);
      setActivity(act);
      setUser(u);
      showMsg('ok', '🎉 报名成功！');
    } catch (e: any) {
      showMsg('err', e.message || '报名失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!user || !activity) return;
    setActionLoading(true);
    try {
      const res = await api.checkinActivity(activity.id, user.id);
      const update = await api.updateUserActivity(user.id, {
        activityId: activity.id,
        activityName: res.name,
        hours: res.duration,
        date: res.date,
        action: 'checkin',
      });
      const prevBadges = user.badges.length;
      setUser(update.user);
      if (update.newBadges.length > prevBadges) {
        const latest = [...update.newBadges].sort((a, b) => b - a)[0];
        triggerBadge(latest);
      }
      const act = await api.getActivity(activity.id);
      setActivity(act);
      showMsg('ok', `✅ 签到成功！服务时长 +${res.duration}小时`);
    } catch (e: any) {
      showMsg('err', e.message || '签到失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#A8A29E' }}>加载中...</div>;
  if (!activity) return <div style={{ textAlign: 'center', padding: 80, color: '#A8A29E' }}>活动不存在</div>;

  const status = STATUS_INFO[activity.status];
  const pct = (activity.registeredCount / activity.maxParticipants) * 100;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {msg && (
        <div style={{
          position: 'fixed',
          top: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          background: msg.type === 'ok' ? '#DCFCE7' : '#FEE2E2',
          color: msg.type === 'ok' ? '#15803D' : '#B91C1C',
          padding: '10px 22px',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          zIndex: 90,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          animation: 'fadeUp 0.3s ease-out both',
        }}>{msg.text}</div>
      )}

      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: '#FFF',
          border: '1px solid #E7E5E4',
          borderRadius: 8,
          color: '#57534E',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: 16,
          transition: 'all 0.15s',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >← 返回</button>

      <div style={{
        background: '#FFF',
        borderRadius: 20,
        padding: 32,
        boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
        animation: 'fadeUp 0.3s ease-out 0.05s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: 8,
              background: status.bg,
              color: status.color,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 14,
            }}>{status.text}</span>
            <h1 style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: '#292524',
              lineHeight: 1.3,
            }}>{activity.name}</h1>
          </div>
          <div style={{ textAlign: 'right', minWidth: 120 }}>
            <div style={{ fontSize: 12, color: '#78716C', marginBottom: 6 }}>招募进度</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: pct >= 100 ? '#EF4444' : '#F59E0B' }}>
              {activity.registeredCount}<span style={{ fontSize: 13, color: '#78716C', fontWeight: 500 }}> / {activity.maxParticipants}</span>
            </div>
            <div style={{
              width: 120,
              height: 6,
              background: '#F5F5F4',
              borderRadius: 3,
              marginTop: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, pct)}%`,
                background: 'linear-gradient(90deg, #F59E0B, #8B5CF6)',
                borderRadius: 3,
              }} />
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          padding: 16,
          background: '#FFFBEB',
          borderRadius: 14,
          marginBottom: 24,
        }}>
          {[
            { icon: '📍', label: '活动地点', value: activity.location },
            { icon: '🗓️', label: '时间', value: activity.dateTime },
            { icon: '⏱️', label: '活动时长', value: `${activity.duration}小时` },
            { icon: '👥', label: '已报名', value: `${activity.registeredCount}人` },
          ].map((it, i) => (
            <div key={i} style={{ animation: `fadeUp 0.3s ease-out ${0.1 + i * 0.03}s both` }}>
              <div style={{ fontSize: 11, color: '#A16207', fontWeight: 600, marginBottom: 4 }}>
                {it.icon} {it.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#451A03' }}>{it.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#292524', margin: '0 0 10px 0' }}>📖 活动描述</h3>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: '#57534E',
            lineHeight: 1.8,
            background: '#FAFAF9',
            padding: 16,
            borderRadius: 12,
          }}>{activity.description}</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#292524', margin: '0 0 10px 0' }}>🎯 技能要求</h3>
          {activity.skillsRequired.length === 0 ? (
            <span style={{ fontSize: 13, color: '#78716C' }}>无特殊要求，欢迎所有志愿者</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activity.skillsRequired.map(s => (
                <span key={s} style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  fontSize: 13,
                  fontWeight: 500,
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>

        {activity.registeredVolunteers && activity.registeredVolunteers.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#292524', margin: '0 0 10px 0' }}>
              👥 已报名志愿者 ({activity.registeredVolunteers.length})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {activity.registeredVolunteers.map(v => (
                <div key={v.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px 6px 6px',
                  background: '#F5F5F4',
                  borderRadius: 20,
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#FFF',
                    border: `2px solid ${AUTH_LEVEL_COLORS[1]}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}>{v.avatar}</div>
                  <span style={{ fontSize: 13, color: '#44403C', fontWeight: 500 }}>{v.nickname}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          padding: 20,
          background: activity.status === 'ended' ? '#F5F5F4' : '#FFF7ED',
          borderRadius: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            {activity.status === 'ended' ? (
              <div style={{ color: '#78716C', fontSize: 13 }}>活动已结束，感谢所有志愿者的参与 🌸</div>
            ) : isCheckedIn ? (
              <div style={{ color: '#15803D', fontSize: 14, fontWeight: 600 }}>✅ 您已完成签到，服务时长将自动记录</div>
            ) : isRegistered ? (
              <div style={{ color: '#92400E', fontSize: 14, fontWeight: 600 }}>📋 您已成功报名，请准时参加</div>
            ) : (
              <div style={{ color: '#57534E', fontSize: 13 }}>
                {user ? '点击按钮报名参与活动' : '请先登录后报名'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {activity.status !== 'ended' && isRegistered && isToday && !isCheckedIn && (
              <button
                onClick={handleCheckin}
                disabled={actionLoading}
                style={{
                  padding: '12px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
                  animation: 'pulseGreen 1s infinite',
                  opacity: actionLoading ? 0.7 : 1,
                }}
                onMouseDown={e => { if (!actionLoading) e.currentTarget.style.transform = 'scale(0.96)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                📍 立即签到
              </button>
            )}
            {activity.status !== 'ended' && !isRegistered && (
              <button
                onClick={handleRegister}
                disabled={actionLoading || pct >= 100}
                style={{
                  padding: '12px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: actionLoading || pct >= 100 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                  transition: 'transform 0.15s',
                  opacity: pct >= 100 ? 0.6 : actionLoading ? 0.7 : 1,
                }}
                onMouseDown={e => { if (!actionLoading && pct < 100) e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {actionLoading ? '处理中...' : pct >= 100 ? '人数已满' : '✨ 立即报名'}
              </button>
            )}
            {isRegistered && activity.status !== 'ended' && !isToday && !isCheckedIn && (
              <div style={{
                padding: '12px 28px',
                borderRadius: 8,
                background: '#E5E7EB',
                color: '#6B7280',
                fontWeight: 600,
                fontSize: 14,
              }}>已报名（等待签到）</div>
            )}
            {(isRegistered && isCheckedIn) || activity.status === 'ended' ? (
              <div style={{
                padding: '12px 28px',
                borderRadius: 8,
                background: '#E5E7EB',
                color: '#6B7280',
                fontWeight: 600,
                fontSize: 14,
              }}>{isCheckedIn ? '已签到' : '已结束'}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
