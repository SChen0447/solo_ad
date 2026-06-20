import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../api';
import { Activity } from '../types';
import { useAuth } from '../context/AuthContext';

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    dateTime: '',
    maxVolunteers: 10,
    description: '',
    skillsRequired: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadActivities();
  }, [user]);

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

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skillsRequired.includes(skillInput.trim())) {
        setFormData({
          ...formData,
          skillsRequired: [...formData.skillsRequired, skillInput.trim()],
        });
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skillsRequired: formData.skillsRequired.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.location || !formData.dateTime || !formData.maxVolunteers) {
      setError('请填写必填项');
      return;
    }

    setSubmitting(true);
    try {
      await activityApi.create({
        ...formData,
        createdBy: user?.id || 'admin-1',
      });
      setShowModal(false);
      setFormData({
        name: '',
        location: '',
        dateTime: '',
        maxVolunteers: 10,
        description: '',
        skillsRequired: [],
      });
      loadActivities();
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recruiting': return '#10B981';
      case 'upcoming': return '#F59E0B';
      case 'ended': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>活动管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 发布新活动
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载中...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">暂无活动，点击上方按钮发布</p>
        </div>
      ) : (
        <div>
          {activities.map((activity) => (
            <div key={activity.id} className="admin-activity-item">
              <div className="admin-activity-info">
                <h3>{activity.name}</h3>
                <p>
                  {activity.location} · {formatDate(activity.dateTime)}
                  <span style={{ marginLeft: '12px' }}>
                    已报名 {activity.registeredCount || 0}/{activity.maxVolunteers} 人
                  </span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: `${getStatusColor(activity.status)}15`,
                    color: getStatusColor(activity.status),
                    fontWeight: 500,
                  }}
                >
                  {getStatusText(activity.status)}
                </span>
                <div className="admin-activity-actions">
                  <button
                    className="icon-btn"
                    onClick={() => navigate(`/activity/${activity.id}`)}
                    title="查看详情"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">发布新活动</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">活动名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入活动名称"
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动地点 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="请输入活动地点"
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动时间 *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">招募人数上限 *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.maxVolunteers}
                  onChange={(e) => setFormData({ ...formData, maxVolunteers: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动描述</label>
                <textarea
                  className="form-input form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入活动描述"
                />
              </div>

              <div className="form-group">
                <label className="form-label">技能要求</label>
                <div
                  className="skills-input"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    input?.focus();
                  }}
                >
                  {formData.skillsRequired.map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                      <button
                        type="button"
                        className="skill-tag-remove"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder={formData.skillsRequired.length === 0 ? '输入后按回车添加' : ''}
                  />
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? '发布中...' : '发布活动'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
