import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Reminder } from '../types';

export default function Reminders() {
  const { reminders, updateReminderStatus, deleteReminder } = useAppStore();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'expiry' | 'medication'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 30;

  const filteredReminders = useMemo(() => {
    return reminders
      .filter(r => {
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterType !== 'all' && r.type !== filterType) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime();
      });
  }, [reminders, filterStatus, filterType]);

  const groupedReminders = useMemo(() => {
    const groups: { [key: string]: Reminder[] } = {};
    filteredReminders.forEach(reminder => {
      const date = new Date(reminder.scheduledTime);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let key;
      if (date.toDateString() === today.toDateString()) {
        key = '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = '昨天';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        key = '明天';
      } else {
        key = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(reminder);
    });
    return groups;
  }, [filteredReminders]);

  const totalPages = Math.ceil(filteredReminders.length / PAGE_SIZE);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;

  let count = 0;
  const paginatedGroups: { [key: string]: Reminder[] } = {};
  Object.entries(groupedReminders).forEach(([date, items]) => {
    items.forEach(item => {
      if (count >= pageStart && count < pageEnd) {
        if (!paginatedGroups[date]) paginatedGroups[date] = [];
        paginatedGroups[date].push(item);
      }
      count++;
    });
  });

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const completedCount = reminders.filter(r => r.status === 'completed').length;
  const expiryCount = reminders.filter(r => r.type === 'expiry' && r.status === 'pending').length;

  const getTypeIcon = (type: string, severity?: string) => {
    if (type === 'expiry') {
      if (severity === 'expired') return '🚨';
      return '⏰';
    }
    return '💊';
  };

  const handleToggle = async (reminder: Reminder) => {
    const newStatus = reminder.status === 'pending' ? 'completed' : 'pending';
    await updateReminderStatus(reminder.id, newStatus);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条提醒吗？')) {
      await deleteReminder(id);
    }
  };

  const getSeverityLabel = (severity?: string) => {
    if (severity === 'expired') return '已过期';
    if (severity === 'near') return '临近过期';
    return '';
  };

  return (
    <div className="reminders-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 提醒中心</h1>
          <p className="page-subtitle">
            共 <strong>{reminders.length}</strong> 条提醒，
            <span className="pending-text">{pendingCount} 条待处理</span>，
            <span className="completed-text">{completedCount} 条已完成</span>
          </p>
        </div>
        <div className="reminder-summary">
          <div className="summary-item expiry">
            <span className="summary-icon">⚠️</span>
            <span className="summary-count">{expiryCount}</span>
            <span className="summary-label">效期预警</span>
          </div>
        </div>
      </div>

      <div className="filter-bar reminders-filter">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('all');
              setCurrentPage(1);
            }}
          >
            全部 <span className="tab-count">{reminders.length}</span>
          </button>
          <button
            className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('pending');
              setCurrentPage(1);
            }}
          >
            待处理 <span className="tab-count">{pendingCount}</span>
          </button>
          <button
            className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus('completed');
              setCurrentPage(1);
            }}
          >
            已完成 <span className="tab-count">{completedCount}</span>
          </button>
        </div>

        <div className="filter-group">
          <label>类型筛选</label>
          <select
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value as 'all' | 'expiry' | 'medication');
              setCurrentPage(1);
            }}
          >
            <option value="all">全部类型</option>
            <option value="expiry">效期提醒</option>
            <option value="medication">用药提醒</option>
          </select>
        </div>
      </div>

      {filteredReminders.length === 0 ? (
        <div className="empty-state large">
          <div className="empty-icon-lg">🎉</div>
          <h3>
            {filterStatus === 'completed'
              ? '还没有已完成的提醒'
              : filterStatus === 'pending'
                ? '太棒了！没有待处理的提醒'
                : '暂无提醒记录'}
          </h3>
          <p>系统会自动检查药品效期，临近过期或已过期时将生成提醒</p>
        </div>
      ) : (
        <>
          <div className="reminders-list">
            {Object.entries(paginatedGroups).map(([date, items]) => (
              <div key={date} className="reminders-date-group">
                <div className="date-header">
                  <span className="date-text">{date}</span>
                  <span className="date-count">
                    {items.length} 条
                  </span>
                </div>

                <div className="reminder-cards">
                  {items.map(reminder => (
                    <div
                      key={reminder.id}
                      className={`reminder-card ${reminder.status} type-${reminder.type} severity-${reminder.severity || 'normal'}`}
                    >
                      <label className="reminder-checkbox">
                        <input
                          type="checkbox"
                          checked={reminder.status === 'completed'}
                          onChange={() => handleToggle(reminder)}
                        />
                        <span className="checkmark">✓</span>
                      </label>

                      <div className="reminder-card-content">
                        <div className="reminder-card-header">
                          <span className={`reminder-type-tag ${reminder.severity || ''}`}>
                            {getTypeIcon(reminder.type, reminder.severity)}
                            {reminder.type === 'expiry'
                              ? getSeverityLabel(reminder.severity)
                              : '用药提醒'}
                          </span>
                          <span className="reminder-time">
                            {new Date(reminder.scheduledTime).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <h3 className="reminder-medicine-name">{reminder.medicineName}</h3>
                        <p className="reminder-message">{reminder.message}</p>

                        {reminder.dosageAmount && (
                          <div className="reminder-dosage">
                            💊 剂量：{reminder.dosageAmount}
                          </div>
                        )}

                        {reminder.status === 'pending' && (
                          <div className="reminder-progress">
                            <div className="progress-bar-fill"></div>
                          </div>
                        )}
                      </div>

                      <button
                        className="reminder-delete"
                        onClick={() => handleDelete(reminder.id)}
                        title="删除提醒"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                « 首页
              </button>
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ‹ 上一页
              </button>

              <div className="page-numbers">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                下一页 ›
              </button>
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                末页 »
              </button>
              <span className="page-info">
                第 {currentPage} / {totalPages} 页
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
