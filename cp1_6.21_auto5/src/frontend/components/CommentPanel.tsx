import React, { useState, useEffect, useRef } from 'react';
import { Comment, User } from '../types';

interface CommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (content: string) => void;
  currentUser: User;
  cardTitle: string;
}

const CommentPanel: React.FC<CommentPanelProps> = ({
  isOpen,
  onClose,
  comments,
  onAddComment,
  currentUser,
  cardTitle,
}) => {
  const [newComment, setNewComment] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <>
      {isOpen && <div style={styles.backdrop} onClick={onClose} />}
      <div style={{
        ...styles.panel,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}>
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <span style={styles.headerIcon}>💬</span>
            <div>
              <h3 style={styles.headerTitle}>评论</h3>
              <p style={styles.headerSubtitle}>
                {cardTitle ? `卡片：${cardTitle.length > 15 ? cardTitle.substring(0, 15) + '...' : cardTitle}` : '当前卡片'}
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div ref={listRef} style={styles.commentList}>
          {comments.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: '48px', marginBottom: '12px' }}>💭</span>
              <p style={styles.emptyText}>还没有评论</p>
              <p style={styles.emptyHint}>成为第一个发表评论的人吧</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={styles.commentItem}>
                <img src={comment.user.avatar} alt="" style={styles.commentAvatar} />
                <div style={styles.commentContent}>
                  <div style={styles.commentHeader}>
                    <span style={styles.commentName}>{comment.user.name}</span>
                    <span style={styles.commentTime}>{formatTime(comment.createdAt)}</span>
                  </div>
                  <p style={styles.commentText}>{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form style={styles.inputForm} onSubmit={handleSubmit}>
          <img src={currentUser.avatar} alt="" style={styles.inputAvatar} />
          <div style={styles.inputWrapper}>
            <input
              type="text"
              style={styles.input}
              placeholder="添加评论..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              style={{
                ...styles.sendBtn,
                opacity: newComment.trim() ? 1 : 0.5,
                cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              }}
              disabled={!newComment.trim()}
            >
              发送
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.2)',
    zIndex: 998,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '380px',
    maxWidth: '100vw',
    background: 'linear-gradient(180deg, #eef6fd 0%, #e8f4fd 100%)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    zIndex: 999,
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px 20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(74, 144, 217, 0.15)',
    background: 'rgba(255,255,255,0.6)',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  headerTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#2c3e50',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#7f8c8d',
    margin: '2px 0 0 0',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(74, 144, 217, 0.1)',
    color: '#4A90D9',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentList: {
    flex: 1,
    padding: '16px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#5a6878',
    margin: 0,
    fontWeight: 500,
  },
  emptyHint: {
    fontSize: '13px',
    color: '#95a5a6',
    margin: '4px 0 0 0',
  },
  commentItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid #fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  commentContent: {
    flex: 1,
    background: '#fff',
    padding: '12px 14px',
    borderRadius: '0 10px 10px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  commentName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2c3e50',
  },
  commentTime: {
    fontSize: '11px',
    color: '#95a5a6',
  },
  commentText: {
    fontSize: '14px',
    color: '#34495e',
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  inputForm: {
    padding: '16px 20px 20px',
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid rgba(74, 144, 217, 0.15)',
    background: 'rgba(255,255,255,0.6)',
  },
  inputAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    gap: '8px',
    background: '#fff',
    borderRadius: '10px',
    padding: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: '8px 12px',
    fontFamily: 'inherit',
    background: 'transparent',
  },
  sendBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
  },
};

export default CommentPanel;
