import React, { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ActionItem, Comment, Attachment } from '../../shared/types';

interface Props {
  actionItems: ActionItem[];
  onRefresh: (filters?: Record<string, string>) => void;
  onUpdate: (id: string, updates: Partial<ActionItem>) => void;
  onDelete: (id: string) => void;
}

const ActionItemBoard: React.FC<Props> = ({ actionItems, onRefresh, onUpdate, onDelete }) => {
  const [filters, setFilters] = useState({
    assignee: '',
    priority: '',
    deadlineFrom: '',
    deadlineTo: '',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverActive, setDragOverActive] = useState(false);

  const unclosedItems = actionItems.filter((a) => a.status !== 'closed');
  const isOverdue = (deadline: string) => deadline && new Date(deadline) < new Date();

  const applyFilters = () => {
    const f: Record<string, string> = {};
    if (filters.assignee) f.assignee = filters.assignee;
    if (filters.priority) f.priority = filters.priority;
    if (filters.deadlineFrom) f.deadlineFrom = filters.deadlineFrom;
    if (filters.deadlineTo) f.deadlineTo = filters.deadlineTo;
    onRefresh(f);
  };

  const clearFilters = () => {
    setFilters({ assignee: '', priority: '', deadlineFrom: '', deadlineTo: '' });
    onRefresh();
  };

  const addComment = (itemId: string) => {
    if (!commentInput.trim()) return;
    const item = actionItems.find((a) => a._id === itemId);
    if (!item) return;
    const newComment: Comment = {
      id: uuidv4(),
      author: localStorage.getItem('nickname') || '匿名',
      content: commentInput.trim(),
      timestamp: new Date().toISOString(),
    };
    onUpdate(itemId, { comments: [...(item.comments || []), newComment] });
    setCommentInput('');
  };

  const handleFileUpload = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    try {
      const res = await fetch(`/api/actions/${itemId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(itemId, { attachments: updated.attachments });
      }
    } catch (e) {
      console.error('Upload failed', e);
    }
  };

  const handleDrop = (itemId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverActive(false);
    handleFileUpload(itemId, e.dataTransfer.files);
  };

  const statusLabel: Record<string, string> = {
    todo: '待办',
    'in-progress': '进行中',
    closed: '已关闭',
  };

  const priorityLabel: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const expanded = expandedId ? actionItems.find((a) => a._id === expandedId) : null;

  return (
    <div>
      <div className="page-header">
        <h1>✅ 行动项看板</h1>
      </div>

      <div className="filter-bar">
        <input
          className="form-input"
          placeholder="按负责人筛选..."
          value={filters.assignee}
          onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
          style={{ width: 160 }}
        />
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          style={{ padding: '8px 12px' }}
        >
          <option value="">全部优先级</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <input
          type="date"
          value={filters.deadlineFrom}
          onChange={(e) => setFilters({ ...filters, deadlineFrom: e.target.value })}
          style={{ padding: '8px 12px' }}
        />
        <span style={{ color: 'var(--slate-400)', fontSize: 13 }}>至</span>
        <input
          type="date"
          value={filters.deadlineTo}
          onChange={(e) => setFilters({ ...filters, deadlineTo: e.target.value })}
          style={{ padding: '8px 12px' }}
        />
        <button className="btn btn-primary btn-sm" onClick={applyFilters}>筛选</button>
        <button className="btn btn-ghost btn-sm" onClick={clearFilters}>清除</button>
      </div>

      {unclosedItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>暂无未关闭的行动项</h3>
          <p>所有行动项已完成，或从议题中创建新的行动项</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {unclosedItems.map((item, index) => (
            <div
              key={item._id}
              className={`card action-card ${isOverdue(item.deadline) ? 'overdue overdue-indicator' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-800)' }}>{item.title}</h3>
                    <span className={`badge badge-${item.priority}`}>{priorityLabel[item.priority]}</span>
                    <span className={`badge badge-${item.status}`}>{statusLabel[item.status]}</span>
                    {isOverdue(item.deadline) && (
                      <span className="badge" style={{ background: '#fef2f2', color: 'var(--red-600)' }}>⚠ 逾期</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)', display: 'flex', gap: 16 }}>
                    {item.assignee && <span>👤 {item.assignee}</span>}
                    {item.deadline && (
                      <span style={{ color: isOverdue(item.deadline) ? 'var(--red-500)' : undefined }}>
                        📅 {item.deadline}
                      </span>
                    )}
                    {item.comments.length > 0 && <span>💬 {item.comments.length}</span>}
                    {item.attachments.length > 0 && <span>📎 {item.attachments.length}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditItem(item)}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteId(item._id)} style={{ color: 'var(--red-500)' }}>🗑</button>
                </div>
              </div>

              {expandedId === item._id && (
                <div
                  style={{ marginTop: 16, borderTop: '1px solid var(--slate-100)', paddingTop: 16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 8 }}>💬 评论</h4>
                      {item.comments.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>暂无评论</p>
                      ) : (
                        item.comments.map((c) => (
                          <div key={c.id} className="comment-item">
                            <span className="comment-author">{c.author}</span>
                            <span className="comment-time">
                              {new Date(c.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="comment-text">{c.content}</div>
                          </div>
                        ))
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          className="form-input"
                          placeholder="添加评论..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addComment(item._id)}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => addComment(item._id)}>发送</button>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 8 }}>📎 附件</h4>
                      {item.attachments.map((att) => (
                        <div key={att.id} className="attachment-item">
                          <span className="file-icon">📄</span>
                          <div className="file-info">
                            <div className="file-name">{att.filename}</div>
                            <div className="file-size">{formatSize(att.size)}</div>
                          </div>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">下载</a>
                        </div>
                      ))}
                      <div
                        className={`attachment-drop-zone ${dragOverActive ? 'drag-over' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOverActive(true); }}
                        onDragLeave={() => setDragOverActive(false)}
                        onDrop={(e) => handleDrop(item._id, e)}
                        onClick={() => {
                          if (fileInputRef.current) fileInputRef.current.click();
                        }}
                      >
                        拖拽文件至此或点击上传
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(item._id, e.target.files)}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    {item.status !== 'in-progress' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--sky-100)', color: 'var(--sky-700)' }}
                        onClick={() => onUpdate(item._id, { status: 'in-progress' })}
                      >
                        标记进行中
                      </button>
                    )}
                    {item.status !== 'closed' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onUpdate(item._id, { status: 'closed' })}
                      >
                        关闭
                      </button>
                    )}
                    {item.status === 'closed' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}
                        onClick={() => onUpdate(item._id, { status: 'todo' })}
                      >
                        重新打开
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑行动项</h3>
              <button className="btn btn-ghost" onClick={() => setEditItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  className="form-input"
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>优先级</label>
                  <select
                    className="form-input"
                    value={editItem.priority}
                    onChange={(e) => setEditItem({ ...editItem, priority: e.target.value as any })}
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>状态</label>
                  <select
                    className="form-input"
                    value={editItem.status}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value as any })}
                  >
                    <option value="todo">待办</option>
                    <option value="in-progress">进行中</option>
                    <option value="closed">已关闭</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>负责人</label>
                  <input
                    className="form-input"
                    value={editItem.assignee}
                    onChange={(e) => setEditItem({ ...editItem, assignee: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>截止日期</label>
                  <input
                    className="form-input"
                    type="date"
                    value={editItem.deadline}
                    onChange={(e) => setEditItem({ ...editItem, deadline: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditItem(null)}>取消</button>
              <button
                className="btn btn-success"
                onClick={() => {
                  onUpdate(editItem._id, {
                    title: editItem.title,
                    priority: editItem.priority,
                    status: editItem.status,
                    assignee: editItem.assignee,
                    deadline: editItem.deadline,
                  });
                  setEditItem(null);
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--slate-600)' }}>确定要删除此行动项吗？</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>取消</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                  if (expandedId === confirmDeleteId) setExpandedId(null);
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionItemBoard;
