import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { PlantCase, Comment, PaginatedCases } from '../types';

const PAGE_SIZE = 5;

const HeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg className="heart-icon" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CommentIcon: React.FC = () => (
  <svg className="comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const formatTime = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

interface FeedCardProps {
  caseItem: PlantCase;
  onLike: (caseId: string) => void;
  onComment: (caseId: string, content: string) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ caseItem, onLike, onComment }) => {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(caseItem.likes);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(caseItem.comments);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalLikes(caseItem.likes);
  }, [caseItem.likes]);

  useEffect(() => {
    setComments(caseItem.comments);
  }, [caseItem.comments]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!liked) {
      setLiked(true);
      setLocalLikes((prev) => prev + 1);
      onLike(caseItem.id);
    }
  };

  const handleCommentToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => commentInputRef.current?.focus(), 300);
      }
      return next;
    });
  };

  const handleCommentSubmit = () => {
    const text = commentText.trim();
    if (text) {
      const newComment: Comment = {
        id: `local-${Date.now()}`,
        author: '我',
        content: text,
        timestamp: Date.now() / 1000,
      };
      setComments((prev) => [...prev, newComment]);
      onComment(caseItem.id, text);
      setCommentText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  return (
    <div className="feed-card">
      <div className="feed-summary" onClick={() => setExpanded((p) => !p)}>
        <img
          src={caseItem.image}
          alt={caseItem.plant_name}
          className="feed-thumbnail"
        />
        <div className="feed-info">
          <h3 className="feed-plant-name">{caseItem.plant_name}</h3>
          <p className="feed-diagnosis-brief">
            诊断：<strong>{caseItem.diagnosis.disease}</strong>
          </p>
          <div className="feed-symptoms">
            {caseItem.symptoms.map((s) => (
              <span key={s} className="feed-symptom-chip">{s}</span>
            ))}
          </div>
          <div className="feed-stats">
            <span>❤️ {localLikes}</span>
            <span>💬 {comments.length}</span>
            <span>{formatTime(caseItem.timestamp)}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="feed-detail expanded">
          <img
            src={caseItem.image}
            alt={caseItem.plant_name}
            className="detail-image"
          />
          <div className="detail-meta">
            <div className="detail-meta-item">
              <div className="detail-meta-value">{caseItem.temperature}°C</div>
              <div className="detail-meta-label">温度</div>
            </div>
            <div className="detail-meta-item">
              <div className="detail-meta-value">{caseItem.humidity}%</div>
              <div className="detail-meta-label">湿度</div>
            </div>
            <div className="detail-meta-item">
              <div className="detail-meta-value">{caseItem.light_hours}h</div>
              <div className="detail-meta-label">光照</div>
            </div>
          </div>
          <div className="detail-diagnosis">
            <h3>病害说明</h3>
            <p>{caseItem.diagnosis.description}</p>
          </div>
          <div className="detail-diagnosis">
            <h3>治理方案</h3>
          </div>
          <pre className="detail-treatment">{caseItem.diagnosis.treatment}</pre>
        </div>
      )}

      <div className="action-bar" onClick={(e) => e.stopPropagation()}>
        <button
          className={`like-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <HeartIcon filled={liked} />
          <span>{localLikes}</span>
        </button>
        <button className="comment-trigger" onClick={handleCommentToggle}>
          <CommentIcon />
          <span>{commentOpen ? '收起评论' : comments.length > 0 ? `${comments.length} 条评论` : '写评论…'}</span>
        </button>
      </div>

      <div className={`comment-section ${commentOpen ? 'open' : ''}`}>
        <div className="comment-input-row">
          <input
            ref={commentInputRef}
            type="text"
            className="comment-input"
            placeholder="写下你的评论..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="comment-submit"
            onClick={handleCommentSubmit}
            disabled={!commentText.trim()}
          >
            发送
          </button>
        </div>
        {comments.length > 0 && (
          <div className="comment-list">
            {comments.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="comment-author">{c.author}</div>
                <div className="comment-content">{c.content}</div>
                <div className="comment-time">{formatTime(c.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Feed: React.FC = () => {
  const [cases, setCases] = useState<PlantCase[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const loadedIdsRef = useRef<Set<string>>(new Set());

  const fetchCases = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await axios.get<PaginatedCases>('/api/cases', {
        params: { page: pageNum, page_size: PAGE_SIZE },
      });
      const newCases = res.data.cases.filter(
        (c) => !loadedIdsRef.current.has(c.id)
      );
      newCases.forEach((c) => loadedIdsRef.current.add(c.id));

      setCases((prev) => {
        if (reset) {
          return [...newCases];
        }
        return [...prev, ...newCases];
      });
      setHasMore(res.data.has_more);
      setPage(pageNum + 1);
    } catch (error) {
      console.error('Fetch cases error:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchCases(0, true);

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('new_case', (newCase: PlantCase) => {
      if (!loadedIdsRef.current.has(newCase.id)) {
        loadedIdsRef.current.add(newCase.id);
        setCases((prev) => [newCase, ...prev]);
      }
    });

    socket.on('like_update', (data: { case_id: string; likes: number }) => {
      setCases((prev) =>
        prev.map((c) => (c.id === data.case_id ? { ...c, likes: data.likes } : c))
      );
    });

    socket.on('comment_update', (data: { case_id: string; comment: Comment }) => {
      setCases((prev) =>
        prev.map((c) =>
          c.id === data.case_id
            ? { ...c, comments: [...c.comments, data.comment] }
            : c
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchCases]);

  const handleLike = async (caseId: string) => {
    try {
      await axios.post(`/api/cases/${caseId}/like`);
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleComment = async (caseId: string, content: string) => {
    try {
      await axios.post(`/api/cases/${caseId}/comment`, { content, author: '我' });
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchCases(page);
    }
  };

  return (
    <div>
      <div className="feed-list">
        {cases.map((caseItem) => (
          <FeedCard
            key={caseItem.id}
            caseItem={caseItem}
            onLike={handleLike}
            onComment={handleComment}
          />
        ))}
      </div>

      {cases.length === 0 && !loading && (
        <div className="empty-state">
          <p>暂无病历记录，点击右下角按钮提交第一份病历吧！</p>
        </div>
      )}

      {hasMore && (
        <div className="load-more">
          {loading ? (
            <span className="loading-more">加载中...</span>
          ) : (
            <button className="load-more-btn" onClick={handleLoadMore}>
              加载更多
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Feed;
