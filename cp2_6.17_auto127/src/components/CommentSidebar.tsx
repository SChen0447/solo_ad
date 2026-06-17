import React, { useState } from 'react';
import { Comment } from '../types';

interface CommentSidebarProps {
  comments: Comment[];
  onDelete: (commentId: string) => void;
  currentUserId: string;
  activeCommentId: string | null;
  onHoverComment: (commentId: string | null) => void;
}

const CommentSidebar: React.FC<CommentSidebarProps> = ({
  comments,
  onDelete,
  currentUserId,
  activeCommentId,
  onHoverComment
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        style={{
          position: 'fixed',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          fontSize: '20px',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
          zIndex: 1000
        }}
      >
        💬
        {comments.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ef4444',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600
          }}>
            {comments.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      width: '280px',
      padding: '16px 0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px 12px',
        marginBottom: '12px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#1f2937'
        }}>
          💬 评注 ({comments.length})
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            color: '#6b7280',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ×
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 16px'
      }}>
        {comments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
            暂无评注<br />
            选中文本可添加评注
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...comments].reverse().map((comment) => (
              <div
                key={comment.id}
                onMouseEnter={() => onHoverComment(comment.id)}
                onMouseLeave={() => onHoverComment(null)}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: `1px solid ${activeCommentId === comment.id ? comment.color : '#e5e7eb'}`,
                  padding: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                  boxShadow: activeCommentId === comment.id ? `0 0 0 3px ${comment.color}20` : 'none'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: comment.color
                  }}
                />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  marginLeft: '4px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: comment.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    {comment.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    {comment.nickname}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    marginLeft: 'auto'
                  }}>
                    {formatDate(comment.createdAt)}
                  </span>
                </div>

                <div style={{
                  marginLeft: '4px',
                  marginBottom: '8px',
                  padding: '6px 10px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  borderLeft: '2px solid #e5e7eb'
                }}>
                  "{comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text}"
                </div>

                <div style={{
                  marginLeft: '4px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#374151',
                  wordBreak: 'break-word'
                }}>
                  {comment.content}
                </div>

                {comment.userId === currentUserId && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      color: '#9ca3af',
                      fontSize: '14px',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#9ca3af';
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSidebar;
