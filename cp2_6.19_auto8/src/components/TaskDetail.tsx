import { useState, useRef, useEffect } from 'react';
import { Task, Member, Comment } from '../types';

interface TaskDetailProps {
  task: Task;
  members: Member[];
  getMemberById: (memberId: string | null) => Member | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN');
};

const generateId = () => Math.random().toString(36).substr(2, 9);

function TaskDetail({ task, members, getMemberById, onClose, onUpdate }: TaskDetailProps) {
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [commentText, setCommentText] = useState('');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const assignee = getMemberById(task.assigneeId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setShowAssigneePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onUpdate({ description });
    }
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDueDate(value);
    onUpdate({ dueDate: value || null });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const currentUserId = members.length > 0 ? members[0].id : null;
    if (!currentUserId) return;

    const newComment: Comment = {
      id: generateId(),
      authorId: currentUserId,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    onUpdate({
      comments: [...task.comments, newComment],
    });
    setCommentText('');
  };

  const handleAssign = (memberId: string | null) => {
    onUpdate({ assigneeId: memberId });
    setShowAssigneePicker(false);
  };

  const insertFormat = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = commentText.substring(start, end);
    const newText =
      commentText.substring(0, start) +
      before +
      selectedText +
      after +
      commentText.substring(end);

    setCommentText(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPos, newPos + after.length);
    }, 0);
  };

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-header">
          <h2 className="detail-title">{task.title}</h2>
          <button className="detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-section">
            <div className="detail-section-title">负责人</div>
            <div className="detail-assignee" ref={assigneeRef}>
              {assignee ? (
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                >
                  <div
                    className="detail-assignee-avatar"
                    style={{ background: assignee.avatarColor }}
                  >
                    {getInitials(assignee.name)}
                  </div>
                  <span className="detail-assignee-name">{assignee.name}</span>
                </div>
              ) : (
                <div
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#999',
                  }}
                  onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                >
                  <div
                    className="detail-assignee-avatar"
                    style={{ background: '#ccc' }}
                  >
                    ?
                  </div>
                  <span className="detail-assignee-name">未分配</span>
                </div>
              )}
              {showAssigneePicker && (
                <div className="assignee-dropdown" style={{ position: 'absolute', top: 80, left: 20, right: 20 }}>
                  <div
                    className="assignee-dropdown-item"
                    onClick={() => handleAssign(null)}
                  >
                    <div className="member-avatar" style={{ background: '#ccc', width: 24, height: 24, fontSize: 11 }}>
                      ?
                    </div>
                    <span>未分配</span>
                  </div>
                  {members.map(m => (
                    <div
                      key={m.id}
                      className="assignee-dropdown-item"
                      onClick={() => handleAssign(m.id)}
                    >
                      <div
                        className="member-avatar"
                        style={{ background: m.avatarColor, width: 24, height: 24, fontSize: 11 }}
                      >
                        {getInitials(m.name)}
                      </div>
                      <span>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">截止日期</div>
            <input
              type="date"
              className="detail-date-input"
              value={dueDate}
              onChange={handleDueDateChange}
            />
          </div>

          <div className="detail-section">
            <div className="detail-section-title">描述</div>
            <textarea
              className="detail-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="添加任务描述..."
            />
          </div>

          <div className="detail-section">
            <div className="detail-section-title">评论 ({task.comments.length})</div>
            <div className="comments-list">
              {task.comments.length === 0 ? (
                <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                  暂无评论
                </div>
              ) : (
                task.comments.map(comment => {
                  const author = getMemberById(comment.authorId);
                  return (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <div
                          className="comment-avatar"
                          style={{ background: author?.avatarColor || '#ccc' }}
                        >
                          {author ? getInitials(author.name) : '?'}
                        </div>
                        <span className="comment-author">
                          {author?.name || '未知用户'}
                        </span>
                        <span className="comment-time">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="comment-toolbar">
              <button onClick={() => insertFormat('**', '**')} title="粗体">
                <b>B</b>
              </button>
              <button onClick={() => insertFormat('*', '*')} title="斜体">
                <i>I</i>
              </button>
              <button onClick={() => insertFormat('~~', '~~')} title="删除线">
                <s>S</s>
              </button>
              <button onClick={() => insertFormat('- ')} title="列表">
                • 列表
              </button>
              <button onClick={() => insertFormat('[', '](url)')} title="链接">
                🔗
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className="comment-input"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="写下你的评论..."
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddComment();
                }
              }}
            />
            <button
              className="comment-submit"
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              style={{ opacity: commentText.trim() ? 1 : 0.5 }}
            >
              发表评论
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default TaskDetail;
