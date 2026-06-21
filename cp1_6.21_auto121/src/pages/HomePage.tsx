import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Calendar,
  MapPin,
  Monitor,
  X,
  Plus,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { Activity } from '../types';

function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinCode, setCheckinCode] = useState('');
  const [checkinError, setCheckinError] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    date: '',
    location: 'offline' as 'offline' | 'online',
    description: '',
    maxParticipants: 20,
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const res = await fetch('/api/activities');
    const data = await res.json();
    setActivities(data);
  };

  const groupByMonth = (acts: Activity[]) => {
    const groups: Record<string, Activity[]> = {};
    acts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((act) => {
        const monthKey = format(parseISO(act.date), 'yyyy-MM');
        if (!groups[monthKey]) groups[monthKey] = [];
        groups[monthKey].push(act);
      });
    return groups;
  };

  const formatMonthTitle = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  const handleCreateActivity = async () => {
    if (!newActivity.name || !newActivity.date || !newActivity.description) {
      return;
    }
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newActivity),
    });
    if (res.ok) {
      setShowCreateModal(false);
      setNewActivity({
        name: '',
        date: '',
        location: 'offline',
        description: '',
        maxParticipants: 20,
      });
      fetchActivities();
    }
  };

  const handleCheckin = async () => {
    if (!selectedActivity) return;
    setCheckinError('');
    setCheckinSuccess(false);
    const res = await fetch(`/api/activities/${selectedActivity.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: checkinCode, memberId: 'mem-001' }),
    });
    const data = await res.json();
    if (res.ok) {
      setCheckinSuccess(true);
      setTimeout(() => {
        setShowCheckinModal(false);
        setCheckinCode('');
        setCheckinSuccess(false);
        setSelectedActivity(null);
        fetchActivities();
      }, 1500);
    } else {
      setCheckinError(data.error);
    }
  };

  const grouped = groupByMonth(activities);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">书友会活动日历</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          创建新活动
        </button>
      </div>

      {Object.entries(grouped).map(([monthKey, acts]) => (
        <div key={monthKey} className="month-group">
          <h2 className="month-title">{formatMonthTitle(monthKey)}</h2>
          <div className="activities-grid">
            {acts.map((act) => (
              <div
                key={act.id}
                className="activity-card"
                onClick={() => setSelectedActivity(act)}
              >
                <div className="activity-card-header">
                  <div>
                    <div className="activity-name">{act.name}</div>
                    <div className="activity-date">
                      <Calendar size={14} />
                      {format(parseISO(act.date), 'M月d日 EEEE', { locale: zhCN })}
                    </div>
                  </div>
                  <span className={`location-badge ${act.location}`}>
                    {act.location === 'offline' ? (
                      <>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        线下
                      </>
                    ) : (
                      <>
                        <Monitor size={12} style={{ display: 'inline', marginRight: 4 }} />
                        线上
                      </>
                    )}
                  </span>
                </div>
                <p className="activity-description">{act.description}</p>
                <div className="activity-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(act.registeredMembers.length / act.maxParticipants) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="progress-label">
                    <span>
                      <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {act.registeredMembers.length}/{act.maxParticipants}人
                    </span>
                    <span>{act.status === 'completed' ? '已结束' : '进行中'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedActivity.name}</h2>
                <div className="activity-date" style={{ marginTop: 6 }}>
                  <Calendar size={14} />
                  {format(parseISO(selectedActivity.date), 'yyyy年M月d日 EEEE', {
                    locale: zhCN,
                  })}
                  <span style={{ margin: '0 8px' }}>·</span>
                  {selectedActivity.location === 'offline' ? (
                    <>
                      <MapPin size={14} />
                      线下活动
                    </>
                  ) : (
                    <>
                      <Monitor size={14} />
                      线上活动
                    </>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedActivity(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.8 }}>
                {selectedActivity.description}
              </p>

              <div className="activity-progress" style={{ marginBottom: 20 }}>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(selectedActivity.registeredMembers.length / selectedActivity.maxParticipants) * 100}%`,
                    }}
                  />
                </div>
                <div className="progress-label">
                  <span>
                    <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                    已报名 {selectedActivity.registeredMembers.length} / {selectedActivity.maxParticipants} 人
                  </span>
                  <span>邀请码：{selectedActivity.inviteCode}</span>
                </div>
              </div>

              <div className="member-list">
                <div className="member-list-title">
                  已报名会员（{selectedActivity.registeredMembers.length}人）
                </div>
                {selectedActivity.registeredMembers.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 12 }}>
                    暂无会员报名
                  </p>
                ) : (
                  selectedActivity.registeredMembers.map((rm) => (
                    <div key={rm.memberId} className="member-item">
                      <div className="member-avatar">
                        {rm.member && <img src={rm.member.avatar} alt={rm.member.name} />}
                      </div>
                      <div className="member-info">
                        <div className="member-name">{rm.member?.name}</div>
                        <div className="member-points">积分余额：{rm.member?.points} 分</div>
                      </div>
                      {rm.checkedIn ? (
                        <span className="checked-badge">
                          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 3 }} />
                          已签到
                        </span>
                      ) : (
                        <span className="unchecked-badge">
                          <Clock size={12} style={{ display: 'inline', marginRight: 3 }} />
                          待签到
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedActivity(null)}
              >
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowCheckinModal(true);
                }}
              >
                <QrCode size={16} />
                开始签到
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckinModal && selectedActivity && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCheckinModal(false);
            setCheckinCode('');
            setCheckinError('');
            setCheckinSuccess(false);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">活动签到</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCheckinModal(false);
                  setCheckinCode('');
                  setCheckinError('');
                  setCheckinSuccess(false);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                请输入「{selectedActivity.name}」的邀请码完成签到，签到成功将获得10积分。
              </p>
              <div className="form-group">
                <label className="label">邀请码</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入活动邀请码"
                  value={checkinCode}
                  onChange={(e) => setCheckinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckin()}
                />
              </div>
              {checkinError && (
                <p style={{ color: '#C0392B', fontSize: 13, marginTop: 8 }}>{checkinError}</p>
              )}
              {checkinSuccess && (
                <p style={{ color: '#27AE60', fontSize: 13, marginTop: 8 }}>
                  ✓ 签到成功！+10 积分
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowCheckinModal(false);
                  setCheckinCode('');
                  setCheckinError('');
                  setCheckinSuccess(false);
                }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCheckin}
                disabled={!checkinCode || checkinSuccess}
              >
                确认签到
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">创建新活动</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">活动名称</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入活动名称"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">活动日期</label>
                  <input
                    type="date"
                    className="input"
                    value={newActivity.date}
                    onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">活动地点</label>
                  <select
                    className="input"
                    value={newActivity.location}
                    onChange={(e) =>
                      setNewActivity({
                        ...newActivity,
                        location: e.target.value as 'offline' | 'online',
                      })
                    }
                  >
                    <option value="offline">线下</option>
                    <option value="online">线上</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">人数上限</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={newActivity.maxParticipants}
                  onChange={(e) =>
                    setNewActivity({
                      ...newActivity,
                      maxParticipants: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="label">活动描述</label>
                <textarea
                  className="input"
                  placeholder="请输入活动描述"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateActivity}
                disabled={!newActivity.name || !newActivity.date || !newActivity.description}
              >
                创建活动
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
