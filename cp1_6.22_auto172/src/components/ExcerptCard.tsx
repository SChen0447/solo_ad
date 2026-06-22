import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Excerpt } from '../api';

interface ExcerptCardProps {
  excerpt: Excerpt;
  onLike: (excerptId: string) => void;
  onComment: (excerptId: string, user: string, content: string) => void;
  index: number;
}

const ExcerptCard: React.FC<ExcerptCardProps> = ({ excerpt, onLike, onComment, index }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentUser, setCommentUser] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [likeAnim, setLikeAnim] = useState(false);
  const [commentBounce, setCommentBounce] = useState(false);
  const [visible, setVisible] = useState(false);
  const prevCommentCountRef = useRef(excerpt.comments.length);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), index * 80);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [index]);

  useEffect(() => {
    if (excerpt.comments.length > prevCommentCountRef.current) {
      setCommentBounce(true);
      const timer = setTimeout(() => setCommentBounce(false), 400);
      prevCommentCountRef.current = excerpt.comments.length;
      return () => clearTimeout(timer);
    }
  }, [excerpt.comments.length]);

  const handleLike = useCallback(() => {
    setLikeAnim(true);
    onLike(excerpt.id);
    setTimeout(() => setLikeAnim(false), 300);
  }, [excerpt.id, onLike]);

  const handleCommentSubmit = useCallback(() => {
    if (!commentUser.trim() || !commentContent.trim()) return;
    onComment(excerpt.id, commentUser.trim(), commentContent.trim());
    setCommentUser('');
    setCommentContent('');
  }, [excerpt.id, commentUser, commentContent, onComment]);

  return (
    <div
      ref={cardRef}
      className="excerpt-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-30px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div className="excerpt-card-border" />
      <div className="excerpt-card-body">
        <div className="excerpt-text">"{excerpt.text}"</div>
        {excerpt.note && (
          <div className="excerpt-note">💡 {excerpt.note}</div>
        )}
        <div className="excerpt-source">
          📖《{excerpt.bookTitle}》· 第{excerpt.page}页
        </div>
        <div className="excerpt-actions">
          <button
            className={`like-btn ${excerpt.liked ? 'liked' : ''} ${likeAnim ? 'like-animate' : ''}`}
            onClick={handleLike}
          >
            <span className="heart-icon">
              {excerpt.liked ? '❤️' : '🤍'}
            </span>
            <span className="like-count">{excerpt.likes}</span>
          </button>
          <button
            className="comment-btn"
            onClick={() => setShowComments(!showComments)}
          >
            💬
            <span className={`comment-count ${commentBounce ? 'comment-bounce' : ''}`}>
              {excerpt.comments.length}
            </span>
          </button>
          <span className="excerpt-time">
            {new Date(excerpt.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
        {showComments && (
          <div className="excerpt-comments">
            {excerpt.comments.map((c) => (
              <div key={c.id} className="comment-item">
                <span className="comment-user">{c.user}：</span>
                <span className="comment-content">{c.content}</span>
              </div>
            ))}
            <div className="comment-form">
              <input
                type="text"
                placeholder="你的昵称"
                value={commentUser}
                onChange={(e) => setCommentUser(e.target.value)}
                className="comment-input-user"
              />
              <input
                type="text"
                placeholder="写下你的评论..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                className="comment-input-content"
              />
              <button className="comment-submit-btn" onClick={handleCommentSubmit}>
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcerptCard;
