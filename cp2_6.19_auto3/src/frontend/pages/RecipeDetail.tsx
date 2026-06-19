import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchRecipe, likeRecipe, setFavorite, removeRecipe } from '../api';
import type { Recipe } from '../types';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);
  const stepElsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchRecipe(Number(id))
      .then(data => {
        setRecipe(data);
        setIsFav(data.isFavorite ?? false);
        setLikeCount(data.likes);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleLike = async () => {
    if (!recipe || likeAnimating) return;
    setLikeAnimating(true);
    try {
      const res = await likeRecipe(recipe.id);
      setLikeCount(res.likes);
    } finally {
      setTimeout(() => setLikeAnimating(false), 400);
    }
  };

  const handleFavorite = async () => {
    if (!recipe) return;
    const next = !isFav;
    await setFavorite(recipe.id, next);
    setIsFav(next);
  };

  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm('确定要删除这道食谱吗？此操作不可撤销。')) return;
    try {
      await removeRecipe(recipe.id);
      navigate('/');
    } catch (err) {
      console.error('删除失败', err);
      alert('删除失败，请重试');
    }
  };

  const scrollToStep = (idx: number) => {
    setCurrentStep(idx);
    const stepEl = stepElsRef.current[idx];
    if (stepEl && stepsRef.current) {
      const container = stepsRef.current;
      const targetLeft = stepEl.offsetLeft - (container.clientWidth - stepEl.clientWidth) / 2;
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!stepsRef.current) return;
    const container = stepsRef.current;
    const scrollLeft = container.scrollLeft;
    const center = scrollLeft + container.clientWidth / 2;
    const children = stepElsRef.current;
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (!el) continue;
      const elCenter = el.offsetLeft + el.clientWidth / 2;
      if (Math.abs(elCenter - center) < el.clientWidth / 2) {
        if (i !== currentStep) {
          setCurrentStep(i);
        }
        break;
      }
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-skeleton">
          <div className="skeleton-shimmer detail-cover-skel" />
          <div className="detail-content-skel">
            <div className="skeleton-line title-line" />
            <div className="skeleton-line meta-line" />
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <div className="detail-page">
      <div className="detail-cover">
        <img src={recipe.coverImage} alt={recipe.title} onError={e => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
        <div className="detail-cover-overlay" />
        <div className="detail-cover-info">
          <h1 className="detail-title">{recipe.title}</h1>
          <p className="detail-date">
            {new Date(recipe.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <Link to="/" className="detail-back">← 返回</Link>
      </div>

      <div className="detail-body">
        <section className="detail-section">
          <h2 className="section-title">🥗 食材清单</h2>
          <ul className="ingredients-list">
            {recipe.ingredients.map((item, i) => (
              <li key={i} className="ingredient-item">
                <span className="ingredient-dot" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h2 className="section-title">📝 烹饪步骤</h2>
          <div className="steps-indicators">
            {recipe.steps.map((_, i) => (
              <button
                key={i}
                className={`step-dot ${i === currentStep ? 'active' : ''}`}
                onClick={() => scrollToStep(i)}
                aria-label={`第${i + 1}步`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div
            className="steps-scroll"
            ref={stepsRef}
            onScroll={handleScroll}
          >
            {recipe.steps.map((step, i) => (
              <div
                key={i}
                ref={el => (stepElsRef.current[i] = el)}
                className="step-card"
              >
                <div className="step-number">{i + 1}</div>
                <p className="step-text">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="detail-actions">
          <button
            className={`action-btn like-btn ${likeAnimating ? 'animating' : ''}`}
            onClick={handleLike}
          >
            <span className="action-icon">❤️</span>
            <span>{likeCount}</span>
          </button>
          <button
            className={`action-btn fav-btn ${isFav ? 'active' : ''}`}
            onClick={handleFavorite}
          >
            <span className="action-icon">{isFav ? '⭐' : '☆'}</span>
            <span>{isFav ? '已收藏' : '收藏'}</span>
          </button>
          <button className="action-btn delete-btn" onClick={handleDelete}>
            <span className="action-icon">🗑️</span>
            <span>删除</span>
          </button>
        </div>
      </div>
    </div>
  );
}
