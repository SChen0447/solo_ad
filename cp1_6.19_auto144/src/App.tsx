import React, { useState, useEffect, useCallback } from 'react';
import {
  Meeting,
  ActionItem,
  getMeetings,
  createMeeting,
  deleteMeeting as apiDeleteMeeting
} from './api';
import RetroBoard from './components/RetroBoard';

interface CreateFormData {
  title: string;
  date: string;
  membersInput: string;
}

const App: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CreateFormData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    membersInput: ''
  });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error('获取会议列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const currentMeeting = meetings.find((m) => m.id === currentMeetingId) || null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      return;
    }
    const members = formData.membersInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const newMeeting = await createMeeting({
        title: formData.title.trim(),
        date: formData.date,
        members
      });
      setMeetings((prev) => [newMeeting, ...prev]);
      setCurrentMeetingId(newMeeting.id);
      setShowCreateModal(false);
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        membersInput: ''
      });
    } catch (err) {
      console.error('创建会议失败:', err);
    }
  };

  const handleDeleteMeeting = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除此复盘会议吗？此操作不可撤销。')) {
      return;
    }
    try {
      await apiDeleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (currentMeetingId === id) {
        setCurrentMeetingId(null);
      }
    } catch (err) {
      console.error('删除会议失败:', err);
    }
  };

  const getMeetingStats = (meeting: Meeting) => {
    const totalActions = meeting.items.action.length;
    const completedActions = meeting.items.action.filter(
      (a: ActionItem) => a.completed
    ).length;
    return { totalActions, completedActions };
  };

  const renderMeetingList = () => {
    if (loading) {
      return <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-text">加载中...</div></div>;
    }
    if (meetings.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-text">暂无复盘会议，点击右上角创建你的第一次回顾吧</div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            创建复盘会议
          </button>
        </div>
      );
    }
    return (
      <div className="meeting-list">
        {meetings.map((meeting) => {
          const stats = getMeetingStats(meeting);
          return (
            <div
              key={meeting.id}
              className="meeting-card"
              onClick={() => setCurrentMeetingId(meeting.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div className="meeting-card-title">{meeting.title}</div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                >
                  删除
                </button>
              </div>
              <div className="meeting-card-date">📅 {meeting.date}</div>
              {meeting.members.length > 0 && (
                <div className="member-tags">
                  {meeting.members.map((m, i) => (
                    <span key={i} className="member-tag">{m}</span>
                  ))}
                </div>
              )}
              <div className="meeting-stats">
                <span>✅ 行动项: {stats.completedActions}/{stats.totalActions}</span>
                <span>📝 要点: {meeting.items.good.length + meeting.items.improve.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const updateCurrentMeeting = (updated: Meeting) => {
    setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🔄 敏捷回顾看板</h1>
        <nav className="app-nav">
          {currentMeetingId && (
            <button className="btn btn-secondary" onClick={() => setCurrentMeetingId(null)}>
              ← 返回会议列表
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + 创建复盘会议
          </button>
        </nav>
      </header>

      <main>
        {currentMeeting ? (
          <RetroBoard meeting={currentMeeting} onUpdate={updateCurrentMeeting} />
        ) : (
          renderMeetingList()
        )}
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">创建复盘会议</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">会议标题 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：Sprint 12 复盘会议"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">复盘日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">参与成员（用逗号分隔）</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：张三, 李四, 王五"
                  value={formData.membersInput}
                  onChange={(e) => setFormData((prev) => ({ ...prev, membersInput: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!formData.title.trim() || !formData.date}
                >
                  创建会议
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
