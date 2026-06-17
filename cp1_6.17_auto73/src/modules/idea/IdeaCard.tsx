import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Idea } from '../../types';

interface IdeaCardProps {
  idea: Idea;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  onVote: (rating: number) => void;
  onComment: (content: string) => void;
  userId: string;
}

export default function IdeaCard({
  idea,
  index,
  isExpanded,
  onToggleExpand,
  onLike,
  onVote,
  onComment,
  userId
}: IdeaCardProps) {
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [commentText, setCommentText] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [cardMousePos, setCardMousePos] = useState({ x: 0, y: 0 });

  const userRating = idea.votes[userId] || 0;
  const hasLiked = idea.likes.includes(userId);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setCardMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCardMousePos({ x: 0, y: 0 });
  }, []);

  const handleLikeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsLikeAnimating(true);
      onLike();
      setTimeout(() => setIsLikeAnimating(false), 300);
    },
    [onLike]
  );

  const handleVoteClick = useCallback(
    async (rating: number) => {
      setIsVoting(true);
      onVote(rating);
      setTimeout(() => {
        setIsVoting(false);
        setShowRating(false);
      }, 300);
    },
    [onVote]
  );

  const handleCommentSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!commentText.trim()) return;
      onComment(commentText.trim());
      setCommentText('');
    },
    [commentText, onComment]
  );

  const handleStarHover = useCallback((e: React.MouseEvent, starIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoveredRating(starIndex + (isHalf ? 0.5 : 1));
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoveredRating(0);
  }, []);

  const handleStarClick = useCallback(
    (e: React.MouseEvent, starIndex: number) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      const rating = starIndex + (isHalf ? 0.5 : 1);
      handleVoteClick(rating);
    },
    [handleVoteClick]
  );

  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const renderStars = useCallback(
    (rating: number) => {
      const stars = [];
      const displayRating = hoveredRating || rating;

      for (let i = 0; i < 5; i++) {
        let starClass = 'star';
        if (displayRating >= i + 1) {
          starClass += ' filled';
        } else if (displayRating >= i + 0.5) {
          starClass += ' half-filled';
        }

        stars.push(
          <span
            key={i}
            className={starClass}
            onMouseMove={(e) => handleStarHover(e, i)}
            onMouseLeave={handleStarLeave}
            onClick={(e) => handleStarClick(e, i)}
          >
            ★
          </span>
        );
      }
      return stars;
    },
    [hoveredRating, handleStarHover, handleStarLeave, handleStarClick]
  );

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.4,
        ease: 'easeOut'
      }
    }),
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  const shadowOffset = {
    x: cardMousePos.x * 8,
    y: cardMousePos.y * 8
  };

  const animationProps = isVoting || isLikeAnimating
    ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } }
    : 'visible';

  return (
    <motion.div
      layout
      custom={index}
      initial="hidden"
      animate={animationProps}
      exit="exit"
      variants={cardVariants}
      className={`idea-card ${isExpanded ? 'expanded' : ''}`}
      onClick={onToggleExpand}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        boxShadow: isVoting || isLikeAnimating
          ? '0 0 30px rgba(0, 212, 255, 0.5)'
          : `${shadowOffset.x}px ${shadowOffset.y}px 20px rgba(0, 0, 0, 0.3)`
      }}
    >
      <div className="idea-card-header">
        <h3 className="idea-card-title">{idea.title}</h3>
      </div>
      <p className="idea-card-author">由 {idea.author_name} 发布</p>
      <p className={`idea-card-description ${isExpanded ? '' : 'collapsed'}`}>
        {idea.description}
      </p>

      <div className="idea-card-stats">
        <span className="stat-item">
          <span className="stat-icon">👍</span>
          {idea.likes_count}
        </span>
        <span className="stat-item">
          <span className="stat-icon">⭐</span>
          {idea.average_rating.toFixed(1)} ({idea.votes_count})
        </span>
        <span className="stat-item">
          <span className="stat-icon">💬</span>
          {idea.comments.length}
        </span>
      </div>

      <div className="idea-card-actions" onClick={(e) => e.stopPropagation()}>
        <motion.button
          className={`btn-action ${hasLiked ? 'active' : ''}`}
          onClick={handleLikeClick}
          whileTap={{ scale: 0.95 }}
        >
          <span>🤙</span>
          {hasLiked ? '已赞' : '点赞'}
        </motion.button>

        <div className="btn-action" onClick={() => setShowRating(!showRating)}>
          <span>⭐</span>
          投票
        </div>

        {showRating && (
          <div className="star-rating">
            {renderStars(userRating)}
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {hoveredRating || userRating || '选择评分'}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="comments-section"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
              评论 ({idea.comments.length})
            </h4>

            {idea.comments.length > 0 && (
              <div className="comments-list">
                {idea.comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="comment-item"
                  >
                    <div className="comment-header">
                      <span className="comment-author">{comment.user_name}</span>
                      <span className="comment-time">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </motion.div>
                ))}
              </div>
            )}

            <form className="comment-input-wrapper" onSubmit={handleCommentSubmit}>
              <input
                type="text"
                className="comment-input"
                placeholder="写下你的评论..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" className="btn-submit" disabled={!commentText.trim()}>
                发送
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
