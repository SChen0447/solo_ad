import React, { useState, useRef } from 'react';
import type { Feedback } from '../App';

interface FeedbackBoardProps {
  pending: Feedback[];
  inProgress: Feedback[];
  done: Feedback[];
  onStatusChange: () => void;
  onDelete: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN');
}

function getCategoryClass(category: string): string {
  switch (category) {
    case '功能建议': return 'tag-feature';
    case 'Bug报告': return 'tag-bug';
    default: return 'tag-other';
  }
}

interface ColumnConfig {
  key: string;
  title: string;
  status: string;
  items: Feedback[];
  dotClass: string;
}

function FeedbackCard({
  feedback,
  onExpand,
  expanded,
  onDeleteClick,
}: {
  feedback: Feedback;
  onExpand: () => void;
  expanded: boolean;
  onDeleteClick: () => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', feedback.id);
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      el.classList.add('dragging');
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  };

  return (
    <div
      className="card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="card-header">
        <span className="card-title" onClick={onExpand} style={{ cursor: 'pointer' }}>
          {feedback.title}
        </span>
        <button
          className="card-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
          title="删除反馈"
        >
          ✕
        </button>
      </div>
      <div className="card-meta">
        <span className={`card-tag ${getCategoryClass(feedback.category)}`}>
          {feedback.category}
        </span>
        <span className="card-time">{formatRelativeTime(feedback.createdAt)}</span>
      </div>
      {expanded && (
        <div className="card-detail" onClick={(e) => e.stopPropagation()}>
          {feedback.description}
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="btn-confirm-delete" onClick={onConfirm}>
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackBoard({ pending, inProgress, done, onStatusChange, onDelete }: FeedbackBoardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const columns: ColumnConfig[] = [
    { key: 'pending', title: '待处理', status: '待处理', items: pending, dotClass: 'dot-pending' },
    { key: 'progress', title: '处理中', status: '处理中', items: inProgress, dotClass: 'dot-progress' },
    { key: 'done', title: '已完成', status: '已完成', items: done, dotClass: 'dot-done' },
  ];

  const handleDragEnter = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    dragCounterRef.current[columnKey] = (dragCounterRef.current[columnKey] || 0) + 1;
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = (_e: React.DragEvent, columnKey: string) => {
    dragCounterRef.current[columnKey] = (dragCounterRef.current[columnKey] || 0) - 1;
    if (dragCounterRef.current[columnKey] <= 0) {
      dragCounterRef.current[columnKey] = 0;
      setDragOverColumn((prev) => (prev === columnKey ? null : prev));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    setDragOverColumn(null);
    dragCounterRef.current = {};

    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange();
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/feedback/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        onDelete();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="board">
      {columns.map((col) => (
        <div
          key={col.key}
          className={`column ${dragOverColumn === col.key ? 'drag-over' : ''}`}
          onDragEnter={(e) => handleDragEnter(e, col.key)}
          onDragLeave={(e) => handleDragLeave(e, col.key)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.status)}
        >
          <div className="column-header">
            <div className="column-title">
              <span className={`dot ${col.dotClass}`} />
              {col.title}
            </div>
            <span className="column-count">{col.items.length}</span>
          </div>

          {dragOverColumn === col.key && (
            <div className="card-placeholder" />
          )}

          {col.items.length === 0 && dragOverColumn !== col.key ? (
            <div className="empty-column">暂无反馈</div>
          ) : (
            col.items.map((fb) => (
              <FeedbackCard
                key={fb.id}
                feedback={fb}
                expanded={expandedId === fb.id}
                onExpand={() => toggleExpand(fb.id)}
                onDeleteClick={() => setDeleteTarget(fb)}
              />
            ))
          )}
        </div>
      ))}

      {deleteTarget && (
        <ConfirmDialog
          message={`确定要删除反馈「${deleteTarget.title}」吗？此操作不可撤销。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default FeedbackBoard;
