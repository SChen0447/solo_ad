import { useState, useRef, useEffect } from 'react';
import type { User, Comment } from '../types';
import '../styles/comment-panel.css';

interface CommentPanelProps {
  comments: Comment[];
  currentUser: User | null;
  onResolveComment: (commentId: string) => void;
  onAddReply: (commentId: string, content: string) => void;
  onAddComment: (lineNumber: number, content: string) => void;
  currentFileName: string;
}

const CommentPanel = ({
  comments,
  currentUser,
  onResolveComment,
  onAddReply,
  onAddComment,
  currentFileName,
}: CommentPanelProps) => {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLine, setQuickAddLine] = useState(1);
  const [quickAddContent, setQuickAddContent] = useState('');
  const prevCommentsLengthRef = useRef(comments.length);
  const newCommentIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current) {
      const newComment = comments[0];
      if (newComment) {
        newCommentIdsRef.current.add(newComment.id);
        setTimeout(() => {
          newCommentIdsRef.current.delete(newComment.id);
        }, 600);
      }
    }
    prevCommentsLengthRef.current = comments.length;
  }, [comments]);

  const filteredComments = comments.filter((c) => {
    if (filter === 'unresolved') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  const toggleExpand = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReply = (commentId: string) => {
    if (!replyContent.trim()) return;
    onAddReply(commentId, replyContent.trim());
    setReplyContent('');
    setReplyingTo(null);
  };

  const handleQuickAdd = () => {
    if (!quickAddContent.trim() || quickAddLine < 1) return;
    onAddComment(quickAddLine, quickAddContent.trim());
    setQuickAddContent('');
    setQuickAddLine(1);
    setShowQuickAdd(false);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="comment-panel">
      <div className="comment-panel-header">
        <div className="panel-title">
          <span className="panel-icon">💬</span>
          <span>代码评论</span>
          <span className="comment-count-badge">{comments.length}</span>
        </div>
        <button
          className="quick-add-btn"
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          title="快速添加评论"
        >
          {showQuickAdd ? '−' : '+'}
        </button>
      </div>

      {showQuickAdd && (
        <div className="quick-add-section animate-fade-in">
          <div className="quick-add-fields">
            <div className="line-number-input">
              <label>行号</label>
              <input
                type="number"
                min="1"
                value={quickAddLine}
                onChange={(e) => setQuickAddLine(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <textarea
            className="quick-add-textarea"
            value={quickAddContent}
            onChange={(e) => setQuickAddContent(e.target.value)}
            placeholder="输入评论内容..."
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleQuickAdd();
              }
            }}
          />
          <div className="quick-add-actions">
            <button
              className="btn-cancel"
              onClick={() => {
                setShowQuickAdd(false);
                setQuickAddContent('');
              }}
            >
              取消
            </button>
            <button
              className="btn-submit"
              onClick={handleQuickAdd}
              disabled={!quickAddContent.trim()}
            >
              发布
            </button>
          </div>
        </div>
      )}

      <div className="comment-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部 <span className="filter-count">{comments.length}</span>
        </button>
        <button
          className={`filter-btn ${filter === 'unresolved' ? 'active' : ''}`}
          onClick={() => setFilter('unresolved')}
        >
          未解决 <span className="filter-count warning">{unresolvedCount}</span>
        </button>
        <button
          className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          已解决 <span className="filter-count success">{resolvedCount}</span>
        </button>
      </div>

      <div className="comment-list" ref={listRef}>
        {filteredComments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p className="empty-title">暂无{filter === 'unresolved' ? '未解决' : filter === 'resolved' ? '已解决' : ''}评论</p>
            <p className="empty-desc">在编辑器中右键或点击行号旁的💬添加评论</p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isNew = newCommentIdsRef.current.has(comment.id);
            const isExpanded = expandedComments.has(comment.id) || comment.replies.length > 0;
            return (
              <div
                key={comment.id}
                className={`comment-card ${comment.resolved ? 'resolved' : ''} ${isNew ? 'animate-slide-in' : ''}`}
              >
                <div className="comment-card-header">
                  <div className="comment-header-left">
                    <div
                      className="comment-avatar"
                      style={{ backgroundColor: comment.author.color }}
                    >
                      {comment.author.avatar}
                    </div>
                    <div className="comment-meta">
                      <div className="comment-meta-top">
                        <span className="comment-author-name">{comment.author.name}</span>
                        <span
                          className={`resolve-icon ${comment.resolved ? 'resolved' : ''}`}
                          onClick={() => !comment.resolved && onResolveComment(comment.id)}
                          title={comment.resolved ? `由 ${comment.resolvedBy?.name} 于 ${formatTime(comment.resolvedAt || 0)} 解决` : '标记为已解决'}
                        >
                          {comment.resolved ? (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                          )}
                        </span>
                      </div>
                      <div className="comment-meta-bottom">
                        <span className="comment-line-tag">L{comment.lineNumber}</span>
                        <span className="comment-time">{formatTime(comment.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="comment-content">
                  {comment.content}
                </div>

                {comment.replies.length > 0 && (
                  <div className={`replies-container ${isExpanded ? '' : 'collapsed'}`}>
                    <button
                      className="replies-toggle"
                      onClick={() => toggleExpand(comment.id)}
                    >
                      <span className="toggle-icon">{isExpanded ? '▾' : '▸'}</span>
                      {comment.replies.length} 条回复
                    </button>
                    {isExpanded && (
                      <div className="replies-list">
                        {comment.replies.map((reply, idx) => (
                          <div key={reply.id} className="reply-item" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div
                              className="reply-avatar"
                              style={{ backgroundColor: reply.author.color }}
                            >
                              {reply.author.avatar}
                            </div>
                            <div className="reply-content-wrapper">
                              <div className="reply-header">
                                <span className="reply-author" style={{ color: reply.author.color }}>
                                  {reply.author.name}
                                </span>
                                <span className="reply-time">{formatTime(reply.createdAt)}</span>
                              </div>
                              <div className="reply-content">{reply.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="comment-actions">
                  {replyingTo === comment.id ? (
                    <div className="reply-form">
                      <textarea
                        className="reply-textarea"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="撰写回复..."
                        rows={2}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setReplyingTo(null);
                            setReplyContent('');
                          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleReply(comment.id);
                          }
                        }}
                      />
                      <div className="reply-actions">
                        <button
                          className="btn-cancel-sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                        >
                          取消
                        </button>
                        <button
                          className="btn-submit-sm"
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim()}
                        >
                          回复
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="action-link"
                        onClick={() => {
                          setReplyingTo(comment.id);
                          setReplyContent('');
                          if (!expandedComments.has(comment.id)) {
                            setExpandedComments((prev) => new Set(prev).add(comment.id));
                          }
                        }}
                      >
                        ↩️ 回复
                      </button>
                      {!comment.resolved && (
                        <button
                          className="action-link resolve"
                          onClick={() => onResolveComment(comment.id)}
                        >
                          ✓ 标记解决
                        </button>
                      )}
                      <button
                        className="action-link expand"
                        onClick={() => toggleExpand(comment.id)}
                      >
                        {isExpanded ? '收起' : '展开'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="comment-panel-footer">
        <div className="footer-stats">
          <span className="stat-item">
            <span className="stat-icon">📄</span>
            {currentFileName}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommentPanel;
