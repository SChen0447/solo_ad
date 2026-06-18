import React, { useState, useEffect, useRef } from 'react';
import { useTaskStore, Task } from '../store/taskStore';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 60000) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

const priorityConfig = {
  high: { label: '高', color: '#ef4444' },
  medium: { label: '中', color: '#f59e0b' },
  low: { label: '低', color: '#22c55e' }
};

const statusConfig = {
  todo: { label: '待办', color: '#ef4444' },
  'in-progress': { label: '进行中', color: '#f59e0b' },
  done: { label: '已完成', color: '#22c55e' }
};

const TaskDetail: React.FC = () => {
  const selectedTask = useTaskStore(state => state.selectedTask);
  const setSelectedTask = useTaskStore(state => state.setSelectedTask);
  const startTimer = useTaskStore(state => state.startTimer);
  const pauseTimer = useTaskStore(state => state.pauseTimer);
  const tasks = useTaskStore(state => state.tasks);

  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const task = tasks.find(t => t.id === selectedTask?.id) || selectedTask;

  useEffect(() => {
    if (task && task.isRunning && task.currentStartTime) {
      const updateDisplay = () => {
        const now = Date.now();
        const elapsed = now - task.currentStartTime!;
        setDisplayTime(task.totalTime + elapsed);
      };

      updateDisplay();
      intervalRef.current = window.setInterval(updateDisplay, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (task) {
      setDisplayTime(task.totalTime);
    }
  }, [task?.id, task?.isRunning, task?.totalTime, task?.currentStartTime]);

  if (!task) return null;

  const handleClose = () => {
    setSelectedTask(null);
  };

  const handleToggleTimer = () => {
    if (task.isRunning) {
      pauseTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <>
      <div className="detail-overlay" onClick={handleClose}>
        <div className="detail-modal" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="detail-header">
            <h2 className="detail-title">{task.title}</h2>
            <div className="detail-tags">
              <span
                className="tag priority-tag"
                style={{ backgroundColor: priority.color + '20', color: priority.color }}
              >
                优先级：{priority.label}
              </span>
              <span
                className="tag status-tag"
                style={{ backgroundColor: status.color + '20', color: status.color }}
              >
                {status.label}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h4 className="section-title">任务描述</h4>
            <p className="description">{task.description || '暂无描述'}</p>
          </div>

          <div className="detail-section">
            <h4 className="section-title">创建时间</h4>
            <p className="meta-text">
              {formatDateTime(task.createdAt)}
              <span className="relative-time">（{formatRelativeTime(task.createdAt)}）</span>
            </p>
          </div>

          <div className="detail-section">
            <div className="timer-section">
              <div>
                <h4 className="section-title">累计耗时</h4>
                <div className="total-time">{formatTime(displayTime)}</div>
              </div>
              <button
                className={`timer-btn-large ${task.isRunning ? 'running' : ''}`}
                onClick={handleToggleTimer}
              >
                {task.isRunning ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    暂停
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    开始
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h4 className="section-title">计时记录</h4>
            <div className="time-records">
              {task.timeRecords.length === 0 ? (
                <p className="empty-text">暂无计时记录</p>
              ) : (
                <ul className="record-list">
                  {task.timeRecords.map((record, index) => {
                    const duration = record.end ? record.end - record.start : 0;
                    return (
                      <li key={index} className="record-item">
                        <div className="record-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                        </div>
                        <div className="record-info">
                          <span className="record-start">{formatDateTime(record.start)}</span>
                          <span className="record-arrow">→</span>
                          <span className="record-end">
                            {record.end ? formatDateTime(record.end) : '进行中'}
                          </span>
                        </div>
                        <span className="record-duration">
                          {record.end ? formatTime(duration) : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .detail-modal {
          background: white;
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
          position: relative;
          animation: scaleIn 0.3s ease-out;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #f3f4f6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }
        .detail-header {
          margin-bottom: 24px;
        }
        .detail-title {
          margin: 0 0 12px 0;
          font-size: 1.4rem;
          font-weight: 700;
          color: #1f2937;
          padding-right: 40px;
        }
        .detail-tags {
          display: flex;
          gap: 10px;
        }
        .tag {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .detail-section {
          margin-bottom: 24px;
        }
        .section-title {
          margin: 0 0 10px 0;
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .description {
          margin: 0;
          color: #374151;
          line-height: 1.6;
          font-size: 0.95rem;
        }
        .meta-text {
          margin: 0;
          color: #374151;
          font-size: 0.9rem;
        }
        .relative-time {
          color: #9ca3af;
          font-size: 0.85rem;
          margin-left: 8px;
        }
        .timer-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 12px;
        }
        .total-time {
          font-size: 2.2rem;
          font-weight: 700;
          font-family: 'SF Mono', Monaco, monospace;
          color: #4f46e5;
        }
        .timer-btn-large {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: #4f46e5;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .timer-btn-large:hover {
          background: #4338ca;
          transform: translateY(-2px);
        }
        .timer-btn-large:active {
          transform: scale(0.98);
        }
        .timer-btn-large.running {
          background: #ef4444;
        }
        .timer-btn-large.running:hover {
          background: #dc2626;
        }
        .time-records {
          max-height: 200px;
          overflow-y: auto;
        }
        .empty-text {
          margin: 0;
          color: #9ca3af;
          font-size: 0.9rem;
          text-align: center;
          padding: 20px;
        }
        .record-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .record-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .record-item:hover {
          background: #f9fafb;
        }
        .record-icon {
          color: #4f46e5;
        }
        .record-info {
          flex: 1;
          font-size: 0.85rem;
          color: #4b5563;
        }
        .record-arrow {
          margin: 0 8px;
          color: #9ca3af;
        }
        .record-end {
          color: #4b5563;
        }
        .record-duration {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.85rem;
          font-weight: 600;
          color: #4f46e5;
          padding: 4px 10px;
          background: #eef2ff;
          border-radius: 6px;
        }
      `}</style>
    </>
  );
};

export default TaskDetail;
