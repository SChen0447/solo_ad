import React, { useState } from 'react';
import type { Activity } from '../services/api';
import { api } from '../services/api';

interface ActivityCardProps {
  activity: Activity;
  onUpdate: (activity: Activity) => void;
  onDelete: (id: string) => void;
  isNew?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onUpdate, onDelete, isNew }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async () => {
    if (isLikeAnimating) return;
    setIsLikeAnimating(true);
    try {
      const updated = await api.likeActivity(activity.id);
      onUpdate(updated);
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setTimeout(() => setIsLikeAnimating(false), 200);
    }
  };

  const handleComment = async () => {
    if (!commentInput.trim()) return;
    try {
      const updated = await api.commentActivity(activity.id, commentInput);
      onUpdate(updated);
      setCommentInput('');
    } catch (error) {
      console.error('评论失败:', error);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteActivity(activity.id);
      setTimeout(() => {
        onDelete(activity.id);
      }, 200);
    } catch (error) {
      console.error('删除失败:', error);
      setIsDeleting(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const closeModal = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setShowModal(false);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <>
      <div
        className="activity-card"
        style={{
          width: '100%',
          maxWidth: '240px',
          minHeight: '160px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
          borderRadius: '12px',
          border: '2px solid #86efac',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
          transition: 'all 200ms ease',
          transform: isNew ? 'translateY(-20px)' : 'translateY(0)',
          opacity: isDeleting ? 0 : 1,
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}
        onClick={openModal}
      >
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '8px',
              wordBreak: 'break-word'
            }}
          >
            {activity.title}
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: '#4b5563',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5
            }}
          >
            {activity.note || '暂无备注'}
          </p>
        </div>

        <div
          className="card-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="like-btn"
            onClick={handleLike}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: activity.liked ? '#fef2f2' : 'transparent',
              transition: 'all 200ms ease',
              transform: isLikeAnimating ? 'scale(0.8)' : 'scale(1)',
              animation: isLikeAnimating ? 'pulse 0.2s ease-in-out' : 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>
              {activity.liked ? '❤️' : '🤍'}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: activity.liked ? '#ef4444' : '#6b7280',
                fontWeight: 500
              }}
            >
              {activity.likes}
            </span>
          </button>

          <button
            className="comment-btn"
            onClick={() => setShowComments(!showComments)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: showComments ? '#eff6ff' : 'transparent',
              transition: 'all 200ms ease'
            }}
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
              {activity.comments.length}
            </span>
          </button>

          <button
            className="delete-btn"
            onClick={handleDelete}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'all 200ms ease',
              opacity: 0.6
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
          >
            <span style={{ fontSize: '16px' }}>🗑️</span>
          </button>
        </div>

        {showComments && (
          <div
            className="comments-section"
            style={{
              overflow: 'hidden',
              animation: 'slideDown 200ms ease-out'
            }}
          >
            {activity.comments.length > 0 && (
              <div style={{ marginBottom: '8px', maxHeight: '80px', overflowY: 'auto' }}>
                {activity.comments.map((comment, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      marginBottom: '4px',
                      fontSize: '12px',
                      color: '#4b5563'
                    }}
                  >
                    {comment}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder="添加评论..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  transition: 'border-color 200ms ease'
                }}
              />
              <button
                onClick={handleComment}
                disabled={!commentInput.trim()}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 200ms ease',
                  opacity: commentInput.trim() ? 1 : 0.5,
                  cursor: commentInput.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            animation: 'fadeIn 200ms ease'
          }}
          onClick={closeModal}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              transform: isAnimating ? 'scale(0.9)' : 'scale(1)',
              opacity: isAnimating ? 0 : 1,
              transition: 'all 200ms ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>{activity.title}</h2>
              <button
                onClick={closeModal}
                style={{ fontSize: '24px', color: '#9ca3af', transition: 'color 200ms ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#4b5563')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                📅 {activity.date}
              </p>
              <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                {activity.note || '暂无备注'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>❤️</span>
                <span style={{ fontSize: '14px', color: '#4b5563' }}>{activity.likes} 人点赞</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>💬</span>
                <span style={{ fontSize: '14px', color: '#4b5563' }}>{activity.comments.length} 条评论</span>
              </div>
            </div>

            {activity.comments.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>评论列表</h3>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {activity.comments.map((comment, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '6px',
                        fontSize: '13px',
                        color: '#4b5563'
                      }}
                    >
                      {comment}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes slideDown {
          from { max-height: 0; opacity: 0; }
          to { max-height: 200px; opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .activity-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
        }
        
        .like-btn:hover {
          background-color: #fef2f2 !important;
        }
        
        .comment-btn:hover {
          background-color: #eff6ff !important;
        }
        
        input:focus {
          border-color: #3b82f6 !important;
        }
      `}</style>
    </>
  );
};

export default ActivityCard;
