import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import MedicineCard from '../components/MedicineCard';
import CountUpCard from '../components/CountUpCard';

export default function Dashboard() {
  const { medicines, reminders, members, stats, currentUserId, addMedicine } = useAppStore();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    specification: '',
    quantity: 0,
    expiryDate: new Date().toISOString().split('T')[0],
    usage: '',
    memberIds: [] as string[],
    timesPerDay: 1,
    startTime: '08:00',
    dosageAmount: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');

  const filteredMedicines = useMemo(() => {
    if (!searchQuery.trim()) return medicines.slice(0, 8);
    return medicines
      .filter(
        m =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.specification.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 8);
  }, [medicines, searchQuery]);

  const pendingReminders = reminders.filter(r => r.status === 'pending').slice(0, 6);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const near7DaysReminders = reminders.filter(r => {
    if (r.status !== 'pending') return false;
    const scheduled = new Date(r.scheduledTime);
    return scheduled >= sevenDaysAgo && scheduled <= sevenDaysLater;
  }).length;

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name.trim()) {
      setFormError('请输入药品名称');
      return;
    }
    if (!newMed.specification.trim()) {
      setFormError('请输入药品规格');
      return;
    }
    if (newMed.quantity <= 0) {
      setFormError('剩余数量必须大于0');
      return;
    }
    try {
      const dosageSchedule = newMed.timesPerDay > 0 ? {
        timesPerDay: newMed.timesPerDay,
        startTime: newMed.startTime,
        dosageAmount: newMed.dosageAmount,
      } : undefined;

      await addMedicine({
        name: newMed.name,
        specification: newMed.specification,
        quantity: newMed.quantity,
        expiryDate: newMed.expiryDate,
        usage: newMed.usage,
        memberIds: newMed.memberIds,
        createdBy: currentUserId,
        dosageSchedule,
      });
      setShowAddModal(false);
      setNewMed({
        name: '',
        specification: '',
        quantity: 0,
        expiryDate: new Date().toISOString().split('T')[0],
        usage: '',
        memberIds: [],
        timesPerDay: 1,
        startTime: '08:00',
        dosageAmount: '',
      });
      setFormError('');
    } catch (err) {
      setFormError('添加失败，请重试');
    }
  };

  const toggleMember = (memberId: string) => {
    setNewMed(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  return (
    <div className="dashboard">
      <div className="stats-row">
        <CountUpCard
          title="药箱药品总数"
          value={stats.medicinesCount}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          icon="📦"
        />
        <CountUpCard
          title="近7天待处理提醒"
          value={near7DaysReminders}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          icon="⏰"
        />
        <CountUpCard
          title="已过期药品"
          value={stats.expiredCount}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          icon="⚠️"
        />
      </div>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">家庭成员</h3>
            <div className="member-list-sidebar">
              {members.map(member => (
                <div
                  key={member.id}
                  className={`sidebar-member ${member.id === currentUserId ? 'active' : ''}`}
                >
                  <div
                    className="sidebar-avatar"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="sidebar-member-info">
                    <span className="sidebar-member-name">{member.name}</span>
                    {member.isOwner && <span className="owner-tag">创建者</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">快速操作</h3>
            <button
              className="action-btn primary"
              onClick={() => setShowAddModal(true)}
            >
              <span className="action-icon">+</span>
              添加药品
            </button>
            <button
              className="action-btn secondary"
              onClick={() => navigate('/reminders')}
            >
              <span className="action-icon">🔔</span>
              查看提醒
            </button>
            <button
              className="action-btn tertiary"
              onClick={() => navigate('/medicine-box')}
            >
              <span className="action-icon">📋</span>
              管理药箱
            </button>
          </div>
        </aside>

        <section className="dashboard-main">
          <div className="section-header">
            <h2>药箱概览</h2>
            <div className="header-actions">
              <input
                type="text"
                className="search-input"
                placeholder="搜索药品..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button
                className="view-all-btn"
                onClick={() => navigate('/medicine-box')}
              >
                查看全部 →
              </button>
            </div>
          </div>

          <div className="medicine-grid">
            {filteredMedicines.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💊</div>
                <p>暂无药品，点击"添加药品"开始管理药箱</p>
              </div>
            ) : (
              filteredMedicines.map((medicine, index) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  index={index}
                />
              ))
            )}
          </div>
        </section>

        <aside className="dashboard-reminders">
          <div className="section-header">
            <h2>最近提醒</h2>
            <span className="reminder-count">{pendingReminders.length} 条待处理</span>
          </div>

          <div className="recent-reminders">
            {pendingReminders.length === 0 ? (
              <div className="empty-state small">
                <div className="empty-icon-sm">✅</div>
                <p>暂无待处理提醒</p>
              </div>
            ) : (
              pendingReminders.map(reminder => (
                <div
                  key={reminder.id}
                  className={`reminder-item severity-${reminder.severity || 'normal'}`}
                  onClick={() => navigate('/reminders')}
                >
                  <div className="reminder-indicator"></div>
                  <div className="reminder-content">
                    <div className="reminder-title">{reminder.medicineName}</div>
                    <div className="reminder-message">{reminder.message}</div>
                    <div className="reminder-time">
                      {new Date(reminder.scheduledTime).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setFormError('');
          }}
        >
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <button
              className="close-btn rotate-in"
              onClick={() => {
                setShowAddModal(false);
                setFormError('');
              }}
            >
              ×
            </button>
            <h2 className="modal-title">添加药品</h2>
            <form onSubmit={handleAddMedicine}>
              <div className="form-row">
                <div className="form-group half">
                  <label>药品名称 *</label>
                  <input
                    type="text"
                    value={newMed.name}
                    onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                    placeholder="如：布洛芬胶囊"
                    autoFocus
                  />
                </div>
                <div className="form-group half">
                  <label>药品规格 *</label>
                  <input
                    type="text"
                    value={newMed.specification}
                    onChange={e => setNewMed({ ...newMed, specification: e.target.value })}
                    placeholder="如：0.3g*24粒"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>剩余数量 *</label>
                  <input
                    type="number"
                    min="0"
                    value={newMed.quantity}
                    onChange={e =>
                      setNewMed({ ...newMed, quantity: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group half">
                  <label>有效期至 *</label>
                  <input
                    type="date"
                    value={newMed.expiryDate}
                    onChange={e => setNewMed({ ...newMed, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>使用说明</label>
                <textarea
                  rows={2}
                  value={newMed.usage}
                  onChange={e => setNewMed({ ...newMed, usage: e.target.value })}
                  placeholder="如：每次1粒，每日3次，饭后服用"
                />
              </div>

              <div className="form-group">
                <label>适用成员</label>
                <div className="member-tags">
                  {members.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className={`member-tag ${newMed.memberIds.includes(member.id) ? 'selected' : ''}`}
                      style={{
                        borderColor: newMed.memberIds.includes(member.id) ? member.color : '#e0e0e0',
                        backgroundColor: newMed.memberIds.includes(member.id)
                          ? `${member.color}20`
                          : '#fff',
                      }}
                      onClick={() => toggleMember(member.id)}
                    >
                      <span
                        className="tag-avatar"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.charAt(0)}
                      </span>
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-divider">
                <span>用药提醒设置（可选）</span>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>每日次数</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={newMed.timesPerDay}
                    onChange={e =>
                      setNewMed({ ...newMed, timesPerDay: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group half">
                  <label>开始时间</label>
                  <input
                    type="time"
                    value={newMed.startTime}
                    onChange={e => setNewMed({ ...newMed, startTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>每次剂量</label>
                <input
                  type="text"
                  value={newMed.dosageAmount}
                  onChange={e => setNewMed({ ...newMed, dosageAmount: e.target.value })}
                  placeholder="如：1粒 / 1袋 / 5ml"
                />
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError('');
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  添加药品
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
