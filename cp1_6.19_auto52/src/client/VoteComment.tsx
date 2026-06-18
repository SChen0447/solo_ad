import React, { useState } from 'react';
import type { Card, Comment } from './types';

interface VoteCommentProps {
  card: Card;
  onVote: (cardId: string) => void;
  onAddComment: (cardId: string, content: string) => Promise<Comment>;
  hasVoted: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

const VoteComment: React.FC<VoteCommentProps> = ({ card, onVote, onAddComment, hasVoted }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(card.comments);

  const handleVoteClick = () => {
    if (!hasVoted) {
      onVote(card.id);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const newComment = await onAddComment(card.id, commentText.trim());
      setLocalComments([...localComments, newComment]);
      setCommentText('');
    } catch (err) {
      console.error('评论失败:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="vote-comment-section">
      <div className="vote-section">
        <button
          className={`vote-btn-large ${hasVoted ? 'voted' : ''}`}
          onClick={handleVoteClick}
          disabled={hasVoted}
        >
          <span className="vote-icon-large">▲</span>
          <span className="vote-text">{hasVoted ? '已赞同' : '赞同'}</span>
          <span className="vote-count">{card.votes}</span>
        </button>
      </div>

      <div className="comments-section">
        <h3 className="comments-title">评论 ({localComments.length})</h3>
        
        <div className="comments-list">
          {localComments.length === 0 ? (
            <p className="no-comments">暂无评论，来说点什么吧～</p>
          ) : (
            localComments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">匿名用户</span>
                  <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))
          )}
        </div>

        <form className="comment-form" onSubmit={handleSubmitComment}>
          <textarea
            className="comment-input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下你的评论（最多200字）"
            maxLength={200}
            rows={3}
            disabled={isSubmitting}
          />
          <div className="comment-form-footer">
            <span className="char-count">{commentText.length}/200</span>
            <button
              type="submit"
              className="comment-submit-btn"
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? '发布中...' : '发布评论'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoteComment;
