import { useState, useEffect } from 'react';
import type { Recipe, Comment } from '../types';

interface Props {
  recipeId: string;
}

interface DetailData {
  recipe: Recipe;
  comments: Comment[];
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function StarIcon({
  filled,
  size = 'normal',
}: {
  filled: boolean;
  size?: 'normal' | 'large';
}) {
  const cls = size === 'large' ? 'rating-star' : 'star';
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill={filled ? '#fbbf24' : '#e5e7eb'}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function RecipeDetail({ recipeId }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [recipeId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('加载详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (score: number) => {
    if (submittingRating) return;
    setSelectedRating(score);
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });
      const result = await res.json();
      if (data) {
        setData({
          ...data,
          recipe: {
            ...data.recipe,
            averageRating: result.averageRating,
            ratingCount: result.ratingCount,
          },
        });
      }
    } catch (err) {
      console.error('提交评分失败:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), content: content.trim() }),
      });
      const newComment = await res.json();
      if (data) {
        setData({
          ...data,
          comments: [newComment, ...data.comments],
        });
      }
      setNickname('');
      setContent('');
    } catch (err) {
      console.error('提交评论失败:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!data) {
    return <div className="empty-state">食谱不存在</div>;
  }

  const { recipe, comments } = data;
  const displayRating = hoverRating || selectedRating;

  return (
    <div className="detail-container">
      <div className="detail-left">
        <div className="detail-image">
          {recipe.image ? (
            <img src={recipe.image} alt={recipe.title} />
          ) : (
            <div className="detail-image-placeholder">🍳 暂无成品图片</div>
          )}
        </div>

        <h1 className="detail-title">{recipe.title}</h1>
        <div className="detail-meta">
          <span>👨‍🍳 {recipe.author}</span>
          <span>🔥 热度 {recipe.heat}</span>
          <span>📅 {formatTime(recipe.createdAt)}</span>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">🥗 用料清单</h3>
          <ul className="ingredients-list">
            {recipe.ingredients.map((ing, idx) => (
              <li
                key={idx}
                className="ingredient-item"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <span className="ingredient-name">{ing.name}</span>
                <span className="ingredient-amount">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">👩‍🍳 制作步骤</h3>
          <ol className="steps-list">
            {recipe.steps.map((step) => (
              <li
                key={step.order}
                className="step-item"
                style={{ animationDelay: `${(step.order - 1) * 0.08}s` }}
              >
                <div className="step-number">{step.order}</div>
                <div className="step-content">
                  <p className="step-description">{step.description}</p>
                  {step.image && (
                    <div className="step-image">
                      <img src={step.image} alt={`步骤${step.order}`} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="detail-right">
        <div className="rating-section">
          <h3 className="rating-header">⭐ 给这道菜评分</h3>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRate(s)}
              >
                <StarIcon filled={s <= displayRating} size="large" />
              </div>
            ))}
          </div>
          <div className="rating-info">
            <span className="rating-average">
              {recipe.ratingCount > 0 ? recipe.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="rating-count">
              共 {recipe.ratingCount} 人评分
            </span>
          </div>
        </div>

        <div className="comments-section">
          <h3 className="comments-header">💬 评论 ({comments.length})</h3>
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              type="text"
              className="comment-input"
              placeholder="你的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
            <textarea
              className="comment-textarea"
              placeholder="分享你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={!nickname.trim() || !content.trim() || submittingComment}
            >
              {submittingComment ? '提交中...' : '发表评论'}
            </button>
          </form>

          {comments.length === 0 ? (
            <div className="empty-state">暂无评论，快来抢沙发吧~</div>
          ) : (
            <ul className="comments-list">
              {comments.map((comment, idx) => (
                <li
                  key={comment.id}
                  className="comment-item"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="comment-meta">
                    <span className="comment-nickname">{comment.nickname}</span>
                    <span className="comment-time">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
