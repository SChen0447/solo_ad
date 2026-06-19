import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '../types';

interface CommentListProps {
  postId: string;
}

const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [author] = useState('当前用户');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [newCommentId, setNewCommentId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (newCommentId && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments, newCommentId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('获取评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author,
          content: newComment.trim()
        })
      });
      
      if (response.ok) {
        const comment = await response.json();
        setNewCommentId(comment.id);
        setComments(prev => [...prev, comment]);
        setNewComment('');
        
        setTimeout(() => {
          setNewCommentId(null);
        }, 1000);
      }
    } catch (error) {
      console.error('发表评论失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="comment-list">
      <h4 className="comment-list__title">
        评论 ({comments.length})
      </h4>
      
      <div className="comment-list__container" ref={listRef}>
        {loading ? (
          <div className="comment-list__loading">加载中...</div>
        ) : comments.length === 0 ? (
          <div className="comment-list__empty">
            暂无评论，快来发表第一条评论吧～
          </div>
        ) : (
          <div className="comment-list__items">
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`comment-item ${newCommentId === comment.id ? 'comment-item--new' : ''}`}
              >
                <div 
                  className="comment-item__avatar"
                  style={{ backgroundColor: getAvatarColor(comment.author) }}
                >
                  {getInitial(comment.author)}
                </div>
                <div className="comment-item__content">
                  <div className="comment-item__header">
                    <span className="comment-item__author">{comment.author}</span>
                    <span className="comment-item__time">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="comment-item__text">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="comment-form__input"
          placeholder="写下你的评论..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          disabled={submitting}
        />
        <button
          type="submit"
          className="comment-form__submit"
          disabled={!newComment.trim() || submitting}
        >
          发送
        </button>
      </form>
    </div>
  );
};

export default CommentList;
