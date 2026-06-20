import React, { useState, useEffect, useRef, useCallback } from 'react';
import { feedbackApi, type Feedback } from '../utils/api';
import { onNewFeedback, onLikeUpdate } from '../utils/socket';

interface FeedbackListProps {
  emotionFilter: string;
  sortBy: string;
  onFeedbacksChange?: (feedbacks: Feedback[]) => void;
}

const emotionLabels: Record<string, { label: string; color: string }> = {
  positive: { label: '积极', color: '#10b981' },
  neutral: { label: '中性', color: '#f59e0b' },
  negative: { label: '消极', color: '#ef4444' },
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
};

interface FeedbackCardProps {
  feedback: Feedback;
  index: number;
  onLike: (id: string) => void;
  likedIds: Set<string>;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback, index, onLike, likedIds }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLiked = likedIds.has(feedback.id);

  const displayContent = feedback.content.length > 50 && !isExpanded
    ? feedback.content.slice(0, 50) + '...'
    : feedback.content;

  const handleLikeClick = () => {
    if (!isLiked) {
      onLike(feedback.id);
    }
  };

  const handleMouseDown = () => {
    if (isLiked) return;
    longPressTimer.current = setTimeout(() => {
      setIsAnimating(true);
      onLike(feedback.id);
      setTimeout(() => setIsAnimating(false), 600);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const emotionInfo = emotionLabels[feedback.emotion] || emotionLabels.neutral;

  return (
    <div
      className="feedback-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="feedback-header">
        <div className="feedback-author">
          <span className="author-avatar">
            {(feedback.is_anonymous ? '匿' : feedback.name?.charAt(0)) || '匿'}
          </span>
          <span className="author-name">
            {feedback.is_anonymous ? '匿名用户' : feedback.name}
          </span>
        </div>
        <span
          className="emotion-badge"
          style={{ background: `linear-gradient(135deg, ${emotionInfo.color}, ${emotionInfo.color}dd)` }}
        >
          {emotionInfo.label}
        </span>
      </div>

      <div className="feedback-content" onClick={() => setIsExpanded(!isExpanded)}>
        {displayContent}
        {feedback.content.length > 50 && (
          <span className="expand-btn">
            {isExpanded ? '收起' : '展开'}
          </span>
        )}
      </div>

      <div className="feedback-footer">
        <span className="feedback-time">{formatTime(feedback.created_at)}</span>
        <button
          className={`like-btn ${isLiked ? 'liked' : ''} ${isAnimating ? 'heartbeat' : ''}`}
          onClick={handleLikeClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          <span className="like-icon">❤</span>
          <span className="like-count">{feedback.likes}</span>
        </button>
      </div>
    </div>
  );
};

const FeedbackList: React.FC<FeedbackListProps> = ({ emotionFilter, sortBy, onFeedbacksChange }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set());

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await feedbackApi.getFeedbacks(emotionFilter, sortBy);
      if (response.success) {
        setFeedbacks(response.data);
        onFeedbacksChange?.(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
    } finally {
      setLoading(false);
    }
  }, [emotionFilter, sortBy, onFeedbacksChange]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    const unsubscribeNew = onNewFeedback((feedback) => {
      if (emotionFilter === 'all' || feedback.emotion === emotionFilter) {
        setFeedbacks((prev) => {
          if (prev.some((f) => f.id === feedback.id)) return prev;
          const newFeedbacks = [feedback, ...prev];
          if (sortBy === 'hottest') {
            return newFeedbacks.sort((a, b) => b.likes - a.likes);
          }
          return newFeedbacks;
        });
      }
    });

    const unsubscribeLike = onLikeUpdate((data) => {
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === data.id ? { ...f, likes: data.likes } : f
        )
      );
    });

    return () => {
      unsubscribeNew();
      unsubscribeLike();
    };
  }, [emotionFilter, sortBy]);

  const handleLike = async (id: string) => {
    if (likedIds.has(id) || likeLoading.has(id)) return;

    setLikeLoading((prev) => new Set(prev).add(id));
    
    try {
      const response = await feedbackApi.likeFeedback(id);
      if (response.success) {
        setLikedIds((prev) => new Set(prev).add(id));
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, likes: response.data.likes } : f
          )
        );
      }
    } catch (error: any) {
      if (error.message === '您已经点过赞了') {
        setLikedIds((prev) => new Set(prev).add(id));
      }
    } finally {
      setLikeLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="feedback-list-loading">
        <div className="loading-spinner-large"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="feedback-list-empty">
        <p>暂无反馈数据</p>
      </div>
    );
  }

  return (
    <div className="feedback-list">
      <h2 className="list-title">
        反馈列表
        <span className="list-count">({feedbacks.length})</span>
      </h2>
      <div className="feedback-cards">
        {feedbacks.map((feedback, index) => (
          <FeedbackCard
            key={feedback.id}
            feedback={feedback}
            index={index}
            onLike={handleLike}
            likedIds={likedIds}
          />
        ))}
      </div>
    </div>
  );
};

export default FeedbackList;
