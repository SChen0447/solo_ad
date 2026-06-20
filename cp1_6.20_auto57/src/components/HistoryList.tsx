import React, { useState } from 'react';
import { HistoryItem } from '../types';

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (city: string) => void;
  onDelete: (id: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onSelect,
  onDelete,
}) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onDelete(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (history.length === 0) {
    return (
      <div className="history-panel glass-effect">
        <h3 className="section-title">搜索历史</h3>
        <div className="history-empty">
          <span className="empty-icon">📋</span>
          <p>暂无搜索记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-panel glass-effect">
      <h3 className="section-title">
        搜索历史 <span className="title-count">{history.length}</span>
      </h3>
      <div className="history-list">
        {history.map((item) => (
          <div
            key={item.id}
            className={`history-item ${deletingIds.has(item.id) ? 'deleting' : ''}`}
            onClick={() => onSelect(item.city)}
          >
            <div className="history-item-content">
              <span className="history-icon">📍</span>
              <div className="history-info">
                <span className="history-city">{item.city}</span>
                <span className="history-time">{formatTime(item.timestamp)}</span>
              </div>
            </div>
            <button
              className="delete-btn"
              onClick={(e) => handleDelete(e, item.id)}
              aria-label="删除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
