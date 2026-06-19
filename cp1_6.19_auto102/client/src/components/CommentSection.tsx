import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import './CommentSection.css';

interface Comment {
  id: number;
  recipe_id: number;
  user_id: number;
  parent_id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  comments: Comment[];
  onSubmit: (content: string, parentId?: number) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, onSubmit }) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && user) {
      onSubmit(newComment.trim());
      setNewComment('');
    }
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (replyContent.trim() && user) {
      onSubmit(replyContent.trim(), parentId);
      setReplyContent('');
      setReplyTo(null);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwn = user && comment.user_id === user.id;

    return (
      <div
        key={comment.id}
        className={`comment-item ${isOwn ? 'own-comment' : 'other-comment'} ${isReply ? 'reply-comment' : ''} fade-in`}
      >
        <div className="comment-avatar">
          {comment.user_avatar ? (
            <img src={comment.user_avatar} alt={comment.user_name} />
          ) : (
            <div className="avatar-placeholder">
              {comment.user_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <div className="comment-body">
          <div className="comment-header">
            <span className="comment-author">{comment.user_name}</span>
            <span className="comment-time">
              {new Date(comment.created_at).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="comment-content">{comment.content}</div>
          {user && !isReply && (
            <button
              className="reply-btn"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              回复
            </button>
          )}
          {replyTo === comment.id && (
            <form
              className="reply-form fade-in"
              onSubmit={(e) => handleReplySubmit(e, comment.id)}
            >
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                rows={2}
              />
              <div className="reply-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setReplyTo(null)}
                >
                  取消
                </button>
                <button type="submit" className="submit-btn">
                  发送
                </button>
              </div>
            </form>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <div className="comment-replies">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="comment-section">
      <h3 className="section-title">评论 ({comments.length})</h3>

      {user ? (
        <form className="comment-form fade-in" onSubmit={handleSubmit}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="分享你的烹饪心得..."
            rows={3}
          />
          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={!newComment.trim()}>
              发表评论
            </button>
          </div>
        </form>
      ) : (
        <div className="login-prompt">
          登录后可以发表评论哦～
        </div>
      )}

      <div className="comment-list">
        {comments.length > 0 ? (
          comments.map((comment) => renderComment(comment))
        ) : (
          <div className="no-comments">
            暂无评论，来抢沙发吧～
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
