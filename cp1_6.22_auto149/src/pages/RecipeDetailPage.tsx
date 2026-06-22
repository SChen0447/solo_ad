import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ScalePanel from '../components/ScalePanel';
import type { Recipe, Review } from '../types';
import './RecipeDetailPage.css';

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 300;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const current = start + (end - start) * easeOut;
      setDisplay(current);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevRef.current = end;
  }, [value]);

  return <span>{display.toFixed(decimals)}</span>;
}

function StarRating({
  rating,
  interactive = false,
  onChange,
  size = 'md',
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  const handleClick = (r: number) => {
    if (interactive && onChange) onChange(r);
  };

  const display = interactive ? (hover || rating) : rating;

  return (
    <div className="star-rating" style={{ gap: size === 'sm' ? 1 : 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        let cls = 'empty';
        if (i <= Math.floor(display)) cls = 'full';
        else if (i - 0.5 <= display) cls = 'half';
        return (
          <span
            key={i}
            className={`sr-star sr-${cls}`}
            style={{ fontSize: sizeClass, cursor: interactive ? 'pointer' : 'default' }}
            onClick={() => handleClick(i)}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [scaleMode, setScaleMode] = useState<'pan' | 'servings'>('pan');
  const [scaleValue, setScaleValue] = useState(0);
  const [bumpIngredients, setBumpIngredients] = useState(0);

  const [userRating, setUserRating] = useState(0);
  const [userContent, setUserContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newReviewId, setNewReviewId] = useState<string | null>(null);

  const [favorited, setFavorited] = useState(false);
  const [favoriteBump, setFavoriteBump] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  const fetchRecipe = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/recipes/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setRecipe(data);
        setFavorited(!!data.favorited);
        setScaleValue(data.basePanSize);
        setLoading(false);
      })
      .catch(() => {
        setRecipe(null);
        setLoading(false);
      });
  }, [id]);

  const fetchReviews = useCallback(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}/reviews`)
      .then(r => r.json())
      .then(data => setReviews(data))
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    fetchRecipe();
    fetchReviews();
  }, [fetchRecipe, fetchReviews]);

  const handleScaleChange = useCallback(
    (factor: number, mode: 'pan' | 'servings', value: number) => {
      const startTime = performance.now();
      setScaleFactor(factor);
      setScaleMode(mode);
      setScaleValue(value);
      setBumpIngredients(k => k + 1);
      const calcTime = performance.now() - startTime;
      if (calcTime > 5) console.warn(`Scale calculation took ${calcTime}ms`);
      fetch(`/api/recipes/${id}/scale-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor, mode, value, calculatedAt: Date.now() }),
      }).catch(() => {});
    },
    [id]
  );

  const handleFavoriteToggle = async () => {
    if (!id || togglingFav) return;
    setTogglingFav(true);
    setFavoriteBump(true);
    setTimeout(() => setFavoriteBump(false), 400);
    try {
      const res = await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' });
      const data = await res.json();
      setFavorited(data.favorited);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || userRating === 0 || !userContent.trim() || submittingReview) return;
    setSubmittingReview(true);
    const startTime = performance.now();
    try {
      const res = await fetch(`/api/recipes/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'local-user',
          userName: '我',
          userAvatar: 'https://i.pravatar.cc/150?img=20',
          rating: userRating,
          content: userContent.trim(),
        }),
      });
      const review = await res.json();
      setNewReviewId(review.id);
      await fetchRecipe();
      await fetchReviews();
      const elapsed = performance.now() - startTime;
      if (elapsed > 450) console.warn(`Review refresh took ${elapsed}ms`);
      setUserRating(0);
      setUserContent('');
      setTimeout(() => setNewReviewId(null), 1500);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loader" />
        <p>正在加载食谱...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="detail-not-found">
        <div className="nf-emoji">😢</div>
        <h2>食谱不存在</h2>
        <button className="back-btn" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-container">
        <button className="go-back-btn" onClick={() => navigate('/')}>
          ← 返回食谱列表
        </button>

        <div className="detail-hero">
          <div
            className="detail-cover"
            style={{
              background: 'linear-gradient(135deg, #f5e6d3 0%, #e8d5b7 100%)',
              backgroundImage: recipe.cover ? `url(${recipe.cover})` : undefined,
            }}
          >
            {!recipe.cover && <div className="cover-emoji-large">🎂</div>}
            <button
              className={`favorite-btn ${favorited ? 'favorited' : ''} ${favoriteBump ? 'bump' : ''}`}
              onClick={handleFavoriteToggle}
              title={favorited ? '取消收藏' : '收藏食谱'}
            >
              <svg viewBox="0 0 24 24" className="fav-icon" aria-hidden="true">
                <path
                  d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z"
                  fill={favorited ? '#a0522d' : 'none'}
                  stroke={favorited ? '#a0522d' : '#a0522d'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="fav-label">{favorited ? '已收藏' : '收藏'}</span>
            </button>
          </div>

          <div className="detail-info">
            <h1 className="detail-title">{recipe.title}</h1>

            <div className="detail-author-row">
              <img src={recipe.author.avatar} alt={recipe.author.name} className="detail-author-avatar" />
              <div>
                <div className="detail-author-name">{recipe.author.name}</div>
                <div className="detail-meta-small">
                  {recipe.basePanSize}寸模具 · {recipe.baseServings}人份
                </div>
              </div>
            </div>

            <div className="detail-rating-row">
              <StarRating rating={recipe.rating} size="md" />
              <span className="detail-rating-score">{recipe.rating.toFixed(1)}</span>
              <span className="detail-rating-divider">·</span>
              <span className="detail-rating-count">{recipe.reviewCount} 条评价</span>
            </div>

            <div className="detail-tags">
              {recipe.tags.map(tag => (
                <span key={tag} className="detail-tag">{tag}</span>
              ))}
            </div>

            <p className="detail-description">{recipe.description}</p>
          </div>
        </div>

        <div className="detail-layout">
          <div className="detail-main">
            <section className="detail-section">
              <h2 className="section-title">
                <span className="section-icon">🥣</span>
                食材列表
                {scaleFactor !== 1 && (
                  <span className="scale-badge">
                    已调整 × {scaleFactor.toFixed(2)}
                  </span>
                )}
              </h2>
              <ul className={`ingredients-list ${bumpIngredients ? 'bump' : ''}`} key={bumpIngredients}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="ingredient-item" style={{ animationDelay: `${i * 20}ms` }}>
                    <span className="ingredient-name">{ing.name}</span>
                    <span className="ingredient-amount-wrap">
                      <span className="ingredient-amount">
                        <AnimatedNumber
                          value={ing.amount * scaleFactor}
                          decimals={ing.amount < 10 ? 1 : 0}
                        />
                      </span>
                      <span className="ingredient-unit">{ing.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="detail-section">
              <h2 className="section-title">
                <span className="section-icon">👩‍🍳</span>
                制作步骤
              </h2>
              <ol className="steps-list">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="step-item">
                    <div className="step-number">{i + 1}</div>
                    <p className="step-text">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="detail-section reviews-section">
              <h2 className="section-title">
                <span className="section-icon">💬</span>
                用户评价
                <span className="review-count-badge">{reviews.length}</span>
              </h2>

              <form className="review-form" onSubmit={handleSubmitReview}>
                <div className="review-form-row">
                  <span className="review-label">你的评分：</span>
                  <StarRating rating={userRating} interactive size="lg" onChange={setUserRating} />
                  {userRating > 0 && <span className="review-rating-text">{userRating} 星</span>}
                </div>
                <textarea
                  className="review-textarea"
                  placeholder="分享你做这个食谱的感受和心得吧~"
                  value={userContent}
                  onChange={e => setUserContent(e.target.value)}
                  rows={3}
                />
                <div className="review-form-actions">
                  <span className="form-tip">
                    {userRating === 0 ? '请先选择评分 ✨' : userContent.trim().length < 5 ? '至少写5个字哦~' : '准备好了！'}
                  </span>
                  <button
                    type="submit"
                    className="submit-review-btn"
                    disabled={submittingReview || userRating === 0 || userContent.trim().length < 5}
                  >
                    {submittingReview ? '提交中...' : '提交评价'}
                  </button>
                </div>
              </form>

              <div className="reviews-list">
                {reviews.length === 0 ? (
                  <div className="no-reviews">暂无评价，来做第一个吧 🌟</div>
                ) : (
                  reviews.map((review, idx) => (
                    <div
                      key={review.id}
                      className={`review-item ${newReviewId === review.id ? 'new-review' : ''}`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <img src={review.userAvatar} alt={review.userName} className="review-avatar" />
                      <div className="review-body">
                        <div className="review-header">
                          <span className="review-author">{review.userName}</span>
                          <StarRating rating={review.rating} size="sm" />
                          <span className="review-time">
                            {new Date(review.createdAt).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="review-content">{review.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="detail-sidebar">
            <ScalePanel
              baseServings={recipe.baseServings}
              basePanSize={recipe.basePanSize}
              onScaleChange={handleScaleChange}
            />

            <div className="scale-summary-card">
              <h4>📊 当前调整</h4>
              <div className="summary-row">
                <span>模式</span>
                <span className="summary-value">{scaleMode === 'pan' ? '模具尺寸' : '食用人数'}</span>
              </div>
              <div className="summary-row">
                <span>目标值</span>
                <span className="summary-value">
                  {scaleMode === 'pan' ? `${scaleValue}寸圆形` : `${scaleValue}人份`}
                </span>
              </div>
              <div className="summary-row highlight">
                <span>用量系数</span>
                <span className="summary-value highlight-value">
                  × {scaleFactor.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
