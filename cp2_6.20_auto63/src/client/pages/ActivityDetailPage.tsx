import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityApi } from '../api';
import { Activity, Registration } from '../types';
import { useAuth } from '../context/AuthContext';
import BadgeModal from '../components/BadgeModal';

function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [badgeModal, setBadgeModal] = useState<{ isOpen: boolean; badgeType: string | null; hours: number }>({
    isOpen: false,
    badgeType: null,
    hours: 0,
  });

  useEffect(() => {
    if (id) {
      loadActivity();
    }
  }, [id]);

  useEffect(() => {
    if (activity && user) {
      loadRegistrationStatus();
    }
  }, [activity, user]);

  const loadActivity = async () => {
    if (!id) return;
    try {
      const data = await activityApi.getById(id);
      setActivity(data);
    } catch (error) {
      console.error('加载活动详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrationStatus = async () => {
    if (!id || !user) return;
    try {
      const regs = await activityApi.getRegistrations(id);
      const userReg = regs.find((r: Registration) => r.userId === user.id);
      if (userReg) {
        setIsRegistered(true);
        setIsCheckedIn(userReg.checkedIn);
      }
    } catch (error) {
      console.error('加载报名状态失败:', error);
    }
  };

  const handleRegister = async () => {
    if (!id || !user) {
      navigate('/login');
      return;
    }

    setRegistering(true);
    try {
      await activityApi.register(id, user.id);
      setIsRegistered(true);
      if (activity) {
        setActivity({
          ...activity,
          registeredCount: (activity.registeredCount || 0) + 1,
        });
      }
    } catch (error: any) {
      alert(error.message || '报名失败');
    } finally {
      setRegistering(false);
    }
  };

  const handleCheckIn = async () => {
    if (!id || !user) return;

    setCheckingIn(true);
    try {
      const result = await activityApi.checkIn(id, user.id);
      setIsCheckedIn(true);

      if (result.newBadge && user) {
        setBadgeModal({
          isOpen: true,
          badgeType: result.newBadge,
          hours: result.totalHours,
        });
      }

      const updatedUser = { ...user, totalHours: result.totalHours };
      if (result.totalHours >= 100) {
        updatedUser.certificationLevel = 3;
      } else if (result.totalHours >= 50) {
        updatedUser.certificationLevel = 2;
      } else if (result.totalHours >= 10) {
        updatedUser.certificationLevel = 1;
      }
      updateUser(updatedUser);
    } catch (error: any) {
      alert(error.message || '签到失败');
    } finally {
      setCheckingIn(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recruiting': return '招募中';
      case 'upcoming': return '即将开始';
      case 'ended': return '已结束';
      default: return status;
    }
  };

  const canCheckIn = () => {
    if (!activity) return false;
    const activityDate = new Date(activity.dateTime);
    const now = new Date();
    const diffTime = activityDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 1 && diffDays >= -1;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载中...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <p className="empty-state-text">活动不存在</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min(
    ((activity.registeredCount || 0) / activity.maxVolunteers) * 100,
    100
  );

  return (
    <div className="activity-detail-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <span>←</span>
        返回活动列表
      </button>

      <div className="activity-detail-card">
        <div className="activity-detail-header">
          <span className={`activity-detail-status ${activity.status}`}>
            {getStatusText(activity.status)}
          </span>
          <h1 className="activity-detail-title">{activity.name}</h1>
          <div className="activity-detail-meta">
            <div className="activity-detail-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{activity.location}</span>
            </div>
            <div className="activity-detail-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatDate(activity.dateTime)}</span>
            </div>
          </div>
        </div>

        <div className="activity-detail-body">
          <div className="activity-detail-section">
            <h3>活动介绍</h3>
            <p className="activity-detail-description">{activity.description}</p>
          </div>

          <div className="activity-detail-section">
            <h3>技能要求</h3>
            <div className="activity-detail-skills">
              {activity.skillsRequired.length > 0 ? (
                activity.skillsRequired.map((skill, index) => (
                  <span key={index} className="activity-detail-skill">
                    {skill}
                  </span>
                ))
              ) : (
                <span style={{ color: '#9CA3AF' }}>无特殊要求</span>
              )}
            </div>
          </div>

          <div className="activity-detail-section">
            <h3>报名情况</h3>
            <div className="activity-detail-volunteers">
              <div className="activity-detail-volunteers-count">
                {activity.registeredCount || 0}
                <small> / {activity.maxVolunteers} 人</small>
              </div>
              <div className="activity-detail-progress">
                <div
                  className="activity-detail-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="activity-detail-footer">
          {isRegistered ? (
            isCheckedIn ? (
              <button className="btn btn-disabled btn-full" disabled>
                ✓ 已签到
              </button>
            ) : canCheckIn() ? (
              <button
                className={`btn btn-success btn-full pulse`}
                onClick={handleCheckIn}
                disabled={checkingIn}
              >
                {checkingIn ? '签到中...' : '立即签到'}
              </button>
            ) : (
              <button className="btn btn-disabled btn-full" disabled>
                已报名
              </button>
            )
          ) : activity.status === 'ended' ? (
            <button className="btn btn-disabled btn-full" disabled>
              活动已结束
            </button>
          ) : (
            <button
              className="btn btn-primary btn-full"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? '报名中...' : '立即报名'}
            </button>
          )}
        </div>
      </div>

      <BadgeModal
        isOpen={badgeModal.isOpen}
        badgeType={badgeModal.badgeType}
        hours={badgeModal.hours}
        onClose={() => setBadgeModal({ ...badgeModal, isOpen: false })}
      />
    </div>
  );
}

export default ActivityDetailPage;
