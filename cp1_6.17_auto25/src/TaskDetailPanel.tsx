import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  Priority,
  TaskStatus,
  SubTask,
  Comment,
  PRIORITY_META,
  STATUS_META,
  formatDateTime,
  calculateSubtaskProgress,
} from './utils';

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
  </svg>
);

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  open,
  onClose,
  onUpdate,
}) => {
  const [descMode, setDescMode] = useState<'edit' | 'preview'>('edit');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  if (!task) return null;

  const progress = calculateSubtaskProgress(task.subtasks);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ title: e.target.value });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ description: e.target.value });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ priority: e.target.value as Priority });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ status: e.target.value as TaskStatus });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ dueDate: e.target.value || null });
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const newSub: SubTask = {
      id: uuidv4(),
      title: newSubtask.trim(),
      completed: false,
    };
    onUpdate({ subtasks: [...task.subtasks, newSub] });
    setNewSubtask('');
  };

  const toggleSubtask = (id: string) => {
    onUpdate({
      subtasks: task.subtasks.map(s =>
        s.id === id ? { ...s, completed: !s.completed } : s
      ),
    });
  };

  const deleteSubtask = (id: string) => {
    onUpdate({
      subtasks: task.subtasks.filter(s => s.id !== id),
    });
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: uuidv4(),
      content: newComment.trim(),
      createdAt: Date.now(),
    };
    onUpdate({ comments: [...task.comments, comment] });
    setNewComment('');
  };

  return (
    <>
      <div
        className={`panel-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <div className={`panel ${open ? 'open' : ''}`}>
        <div className="panel-header">
          <div className="panel-header-top">
            <div className="panel-decor" />
            <button className="close-btn" onClick={onClose} aria-label="关闭">
              <CloseIcon />
            </button>
          </div>
          <input
            type="text"
            className="panel-title-input"
            value={task.title}
            onChange={handleTitleChange}
            placeholder="任务标题..."
          />
          <div className="panel-meta-row">
            <select
              className="meta-select"
              value={task.priority}
              onChange={handlePriorityChange}
              style={{
                borderLeft: `4px solid ${PRIORITY_META[task.priority].color}`,
              }}
            >
              {(['P1', 'P2', 'P3'] as Priority[]).map(p => (
                <option key={p} value={p}>
                  优先级：{p}
                </option>
              ))}
            </select>
            <select
              className="meta-select"
              value={task.status}
              onChange={handleStatusChange}
            >
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="meta-select"
              value={task.dueDate || ''}
              onChange={handleDueDateChange}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        <div className="panel-body">
          <div className="panel-section">
            <div className="section-header">
              <div className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4f6ef7' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                任务描述
              </div>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${descMode === 'edit' ? 'active' : ''}`}
                  onClick={() => setDescMode('edit')}
                  style={{ borderRadius: '6px 0 0 6px' }}
                >
                  编辑
                </button>
                <button
                  className={`toggle-btn ${descMode === 'preview' ? 'active' : ''}`}
                  onClick={() => setDescMode('preview')}
                  style={{ borderRadius: '0 6px 6px 0' }}
                >
                  预览
                </button>
              </div>
            </div>
            {descMode === 'edit' ? (
              <textarea
                className="textarea"
                value={task.description}
                onChange={handleDescChange}
                placeholder="支持 Markdown 格式...&#10;&#10;**粗体**、*斜体*、`代码`&#10;- 列表项 1&#10;- 列表项 2&#10;> 引用文字"
              />
            ) : (
              <div className="markdown-preview">
                {task.description ? (
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>暂无描述</span>
                )}
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-header">
              <div className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7c3aed' }}>
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                子任务
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {task.subtasks.length > 0 && (
              <div className="subtask-list">
                {task.subtasks.map(subtask => (
                  <div key={subtask.id} className="subtask-item">
                    <div
                      className={`subtask-checkbox ${subtask.completed ? 'checked' : ''}`}
                      onClick={() => toggleSubtask(subtask.id)}
                    >
                      {subtask.completed && <CheckIcon />}
                    </div>
                    <input
                      className="subtask-title"
                      value={subtask.title}
                      disabled={subtask.completed}
                      onChange={e => {
                        onUpdate({
                          subtasks: task.subtasks.map(s =>
                            s.id === subtask.id ? { ...s, title: e.target.value } : s
                          ),
                        });
                      }}
                    />
                    <button
                      className="subtask-delete"
                      onClick={() => deleteSubtask(subtask.id)}
                      aria-label="删除子任务"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-subtask">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="添加新子任务..."
              />
              <button className="add-btn" onClick={addSubtask}>
                添加
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-header">
              <div className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4f6ef7' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                评论 ({task.comments.length})
              </div>
            </div>

            {task.comments.length > 0 ? (
              <div className="comment-list">
                {task.comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">我</div>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <span className="comment-author">用户</span>
                        <span className="comment-time">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                暂无评论
              </div>
            )}

            <div className="add-comment">
              <textarea
                className="textarea"
                style={{ minHeight: '80px' }}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="写下你的评论..."
              />
              <button
                className="add-btn"
                style={{ alignSelf: 'flex-end' }}
                onClick={addComment}
                disabled={!newComment.trim()}
              >
                发送评论
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetailPanel;
