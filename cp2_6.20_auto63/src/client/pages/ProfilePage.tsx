import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { User, Registration, ServiceRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { getCertificationBorderColor } from '../utils/colors';

function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'registered' | 'history'>('registered');
  const [loading, setLoading] = useState(true);

  const userId = id || currentUser?.id;

  useEffect(() => {
    if (userId) {
      loadProfile();
    } else {
      navigate('/login');
    }
  }, [userId, currentUser]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [userData, regData, recordData] = await Promise.all([
        userApi.getProfile(userId),
        userApi.getRegistrations(userId),
        userApi.getServiceRecords(userId),
      ]);
      setProfileUser(userData);
      setRegistrations(regData);
      setServiceRecords(recordData);
    } catch (error) {
      console.error('加载用户资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusText = (reg: Registration) => {
    if (reg.checkedIn) return '已完成';
    if (reg.activityStatus === 'ended') return '已结束';
    return '已报名';
  };

  const RADIUS = 64;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const MAX_HOURS = 200;

  const getProgressOffset = (totalHours: number) => {
    if (typeof totalHours !== 'number' || isNaN(totalHours) || totalHours <= 0) {
      return CIRCUMFERENCE;
    }
    if (MAX_HOURS <= 0) {
      return CIRCUMFERENCE;
    }
    const progress = Math.min(totalHours / MAX_HOURS, 1);
    return CIRCUMFERENCE * (1 - progress);
  };

  const getProgressPercentage = (totalHours: number) => {
    if (typeof totalHours !== 'number' || isNaN(totalHours) || totalHours <= 0) {
      return 0;
    }
    if (MAX_HOURS <= 0) {
      return 0;
    }
    return Math.min((totalHours / MAX_HOURS) * 100, 100);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载中...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-container">
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <p className="empty-state-text">用户不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="progress-ring-container">
          <svg className="progress-ring" width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
            </defs>
            <circle
              className="progress-ring-bg"
              cx="70"
              cy="70"
              r={RADIUS}
              strokeWidth="6"
            />
            <circle
              className="progress-ring-fill"
              cx="70"
              cy="70"
              r={RADIUS}
              strokeWidth="6"
              strokeDasharray={CIRCUMFERENCE}
              style={{
                strokeDashoffset: CIRCUMFERENCE,
                animation: `fillProgress 0.5s ease forwards 0.1s`,
              }}
            />
          </svg>
          <div className="profile-avatar-wrapper">
            <div
              className="profile-avatar"
              style={{
                borderColor: getCertificationBorderColor(profileUser.certificationLevel),
                background: `linear-gradient(135deg, #F59E0B, ${getCertificationBorderColor(profileUser.certificationLevel)})`,
              }}
            >
              {profileUser.nickname.charAt(0)}
            </div>
          </div>
          <style>{`
            @keyframes fillProgress {
              from {
                stroke-dashoffset: ${CIRCUMFERENCE};
              }
              to {
                stroke-dashoffset: ${getProgressOffset(profileUser.totalHours)};
              }
            }
          `}</style>
        </div>

        <div className="profile-info">
          <h1 className="profile-name">{profileUser.nickname}</h1>
          <div className="profile-hours-text">
            <strong>{profileUser.totalHours}</strong>
            小时服务时长
          </div>
          <div className="profile-skills">
            {profileUser.skills.map((skill, index) => (
              <span key={index} className="profile-skill">
                {skill}
              </span>
            ))}
          </div>
          {profileUser.availableTime && (
            <p className="profile-time-info">
              可服务时段：{profileUser.availableTime}
            </p>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'registered' ? 'active' : ''}`}
            onClick={() => setActiveTab('registered')}
          >
            已报名活动
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            服务历史
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === 'registered' && (
            <div className="tab-content" key="registered">
              {registrations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p className="empty-state-text">暂无报名活动</p>
                </div>
              ) : (
                registrations.map((reg, index) => (
                  <div
                    key={reg.id}
                    className="activity-item fade-in-up-item"
                    onClick={() => navigate(`/activity/${reg.activityId}`)}
                    style={{ cursor: 'pointer', animationDelay: `${0.05 * index}s` }}
                  >
                    <div className="activity-item-info">
                      <h4>{reg.activityName}</h4>
                      <p>
                        {reg.activityLocation} · {formatDate(reg.activityDateTime || '')}
                      </p>
                    </div>
                    <span
                      className={`activity-item-status ${
                        reg.checkedIn ? 'checked-in' : reg.activityStatus === 'ended' ? 'ended' : 'registered'
                      }`}
                    >
                      {getStatusText(reg)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="tab-content" key="history">
              {serviceRecords.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p className="empty-state-text">暂无服务记录</p>
                </div>
              ) : (
                serviceRecords.map((record, index) => (
                  <div 
                    key={record.id} 
                    className="service-record-item fade-in-up-item"
                    style={{ animationDelay: `${0.05 * index}s` }}
                  >
                    <div className="service-record-info">
                      <h4>{record.activityName}</h4>
                      <p>{record.date}</p>
                    </div>
                    <div className="service-record-hours">
                      +{record.hours}
                      <small> 小时</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
