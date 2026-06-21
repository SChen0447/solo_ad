import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Song, Comment } from '../api';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  return `${months}个月前`;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star-input-item ${i <= (hover || value) ? 'filled' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          {i <= (hover || value) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

function RatingDisplay({ rating, animated }: { rating: number; animated?: boolean }) {
  const [displayRating, setDisplayRating] = useState(rating);
  useEffect(() => {
    if (animated) {
      const start = displayRating;
      const end = rating;
      const duration = 400;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayRating(start + (end - start) * eased);
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } else {
      setDisplayRating(rating);
    }
  }, [rating]);
  const full = Math.floor(displayRating);
  const hasHalf = displayRating - full >= 0.5;
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= full ? 'star filled' : i === full + 1 && hasHalf ? 'star half' : 'star empty'}>
          {i <= full ? '★' : i === full + 1 && hasHalf ? '★' : '☆'}
        </span>
      ))}
      <span className="rating-num">{displayRating.toFixed(1)}</span>
    </span>
  );
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingAnimKey, setRatingAnimKey] = useState(0);

  const loadSong = useCallback(() => {
    if (!id) return;
    api.getSong(id).then(setSong).catch(console.error);
  }, [id]);

  const loadComments = useCallback(() => {
    if (!id) return;
    api.getComments(id).then(setComments).catch(console.error);
  }, [id]);

  useEffect(() => {
    loadSong();
    loadComments();
  }, [loadSong, loadComments]);

  const handleRate = (rating: number) => {
    if (!id) return;
    setUserRating(rating);
    api.rateSong(id, rating).then(updated => {
      setSong(updated);
      setRatingAnimKey(k => k + 1);
    });
  };

  const handleSubmitComment = () => {
    if (!id || !commentText.trim() || !username.trim()) return;
    setSubmitting(true);
    api.addComment({ songId: id, username: username.trim(), content: commentText.trim() })
      .then(() => {
        setCommentText('');
        loadComments();
      })
      .finally(() => {
        setTimeout(() => setSubmitting(false), 400);
      });
  };

  if (!song) {
    return <div className="loading-text">加载中...</div>;
  }

  return (
    <div className="song-detail-page">
      <Link to="/" className="back-link">← 返回歌曲列表</Link>
      <div className="song-detail-header">
        <div className="song-detail-cover" style={{ background: song.coverColor }}>
          <span className="cover-icon-large">🎵</span>
        </div>
        <div className="song-detail-info">
          <h1>{song.title}</h1>
          <p className="detail-meta">艺术家: <span className="detail-value">{song.artist}</span></p>
          <p className="detail-meta">专辑: <span className="detail-value">{song.album}</span></p>
          <p className="detail-meta">时长: <span className="detail-value">{formatTime(song.duration)}</span></p>
          <p className="detail-meta">类型: <span className="detail-value genre-tag">{song.genre}</span></p>
          <div className="detail-meta">
            平均评分: <RatingDisplay key={ratingAnimKey} rating={song.averageRating} animated />
          </div>
          <div className="rate-section">
            <span className="rate-label">我的评分:</span>
            <StarInput value={userRating} onChange={handleRate} />
          </div>
        </div>
      </div>

      <div className="comments-section">
        <h2>评论区 ({comments.length})</h2>
        <div className="comments-list">
          {comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar" style={{ background: c.avatarColor }}>
                {c.username[0]}
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-username">{c.username}</span>
                  <span className="comment-time">{formatTimestamp(c.timestamp)}</span>
                </div>
                <p className="comment-content">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="empty-state">暂无评论，快来发表第一条吧！</div>}
        </div>

        <div className="comment-form">
          <input
            className="comment-input username-input"
            placeholder="你的昵称"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
          />
          <input
            className="comment-input content-input"
            placeholder="写下你的评论..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            maxLength={200}
          />
          <button
            className={`submit-btn ${submitting ? 'loading' : ''}`}
            onClick={handleSubmitComment}
            disabled={submitting || !commentText.trim() || !username.trim()}
          >
            {submitting ? '' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
