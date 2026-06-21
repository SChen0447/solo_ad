import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';
import TimerPanel from './TimerPanel';
import type { Recipe } from './types';
import './RecipeDetail.css';

interface RecipeDetailProps {
  socket: any;
}

export default function RecipeDetail({ socket }: RecipeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [favoriteAnimating, setFavoriteAnimating] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = async () => {
      try {
        const data = await api.recipes.get(id);
        setRecipe(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchFavoriteStatus = async () => {
      try {
        const data = await api.favorites.status(id);
        setFavorited(data.favorited);
      } catch (err) {
        // ignore
      }
    };

    fetchFavoriteStatus();
  }, [id, user]);

  useEffect(() => {
    if (!socket || !id) return;

    const handleSessionStarted = (session: any) => {
      if (session.recipeId === id) {
        setActiveSession(session);
      }
    };

    const handleSessionEnded = (data: any) => {
      if (activeSession?.id === data.sessionId) {
        setActiveSession(null);
      }
    };

    socket.on('session_started', handleSessionStarted);
    socket.on('session_ended', handleSessionEnded);

    return () => {
      socket.off('session_started', handleSessionStarted);
      socket.off('session_ended', handleSessionEnded);
    };
  }, [socket, id, activeSession]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setFavoriteAnimating(true);
    setTimeout(() => setFavoriteAnimating(false), 500);

    try {
      const data = await api.favorites.toggle(id!);
      setFavorited(data.favorited);

      if (recipe) {
        setRecipe({
          ...recipe,
          ratingCount: (recipe.ratingCount || 0),
        });
      }
    } catch (err) {
      // ignore
    }
  };

  const handleRate = async (score: number) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await api.ratings.rate(id!, score);
      setUserRating(score);

      const updatedRecipe = await api.recipes.get(id!);
      setRecipe(updatedRecipe);
    } catch (err) {
      // ignore
    }
  };

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}分钟`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours}小时${remainMins}分钟` : `${hours}小时`;
  };

  if (loading) {
    return (
      <div className="recipe-detail-container">
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="recipe-detail-container">
        <div className="error-state">{error || '食谱不存在'}</div>
      </div>
    );
  }

  const isOwner = user?.id === recipe.authorId;

  return (
    <div className="recipe-detail-container">
      <div className="recipe-detail">
        <div className="recipe-header">
          <Link to="/" className="back-btn">
            ← 返回列表
          </Link>
          {isOwner && (
            <div className="owner-actions">
              <button
                className="edit-btn"
                onClick={() => navigate(`/edit-recipe/${recipe.id}`)}
              >
                ✏️ 编辑
              </button>
              <button
                className="delete-btn"
                onClick={async () => {
                  if (confirm('确定要删除这个食谱吗?')) {
                    try {
                      await api.recipes.delete(recipe.id);
                      navigate('/');
                    } catch (err) {
                      alert('删除失败');
                    }
                  }
                }}
              >
                🗑️ 删除
              </button>
            </div>
          )}
        </div>

        <div className="recipe-hero">
          <img src={recipe.coverImage} alt={recipe.title} />
          <div className="recipe-hero-overlay">
            <div className="recipe-hero-content">
              <span className="recipe-cuisine-badge">
                {recipe.cuisine === 'chinese' && '中餐'}
                {recipe.cuisine === 'japanese' && '日料'}
                {recipe.cuisine === 'western' && '西餐'}
                {recipe.cuisine === 'other' && '其他'}
              </span>
              <h1 className="recipe-title-large">{recipe.title}</h1>
              <div className="recipe-meta-large">
                <span>⏱ {formatTime(recipe.totalTime)}</span>
                <span>👨‍🍳 {recipe.authorName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="recipe-content">
          <div className="recipe-main">
            <div className="recipe-section">
              <div className="section-header">
                <h2>📝 简介</h2>
                <button
                  className={`favorite-btn ${favorited ? 'favorited' : ''} ${favoriteAnimating ? 'animating' : ''}`}
                  onClick={toggleFavorite}
                >
                  <span className="heart-icon">{favorited ? '❤️' : '🤍'}</span>
                  <span>{favorited ? '已收藏' : '收藏'}</span>
                </button>
              </div>
              <p className="recipe-description-text">{recipe.description}</p>
            </div>

            <div className="recipe-section">
              <h2>⭐ 评分</h2>
              <div className="rating-display">
                <div className="rating-score">
                  {recipe.averageRating || 0}
                  <span className="rating-max">/5</span>
                </div>
                <div className="rating-stars-large">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star-large ${star <= Math.round(recipe.averageRating || 0) ? 'filled' : ''} ${star <= userRating ? 'user-rated' : ''}`}
                      onClick={() => handleRate(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div className="rating-count-text">
                  共 {recipe.ratingCount || 0} 人评价
                </div>
              </div>
            </div>

            <div className="recipe-section">
              <h2>🥗 食材清单</h2>
              <div className="ingredients-list">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className={`ingredient-item ${checkedIngredients.has(index) ? 'checked' : ''}`}
                    onClick={() => toggleIngredient(index)}
                  >
                    <div className="ingredient-checkbox">
                      {checkedIngredients.has(index) ? '✓' : ''}
                    </div>
                    <span className="ingredient-text">{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="recipe-section">
              <h2>👨‍🍳 烹饪步骤</h2>
              <div className="steps-list">
                {recipe.steps.map((step, index) => (
                  <div key={step.id} className="step-item">
                    <div className="step-number-badge">{index + 1}</div>
                    <div className="step-content">
                      <h3 className="step-title">{step.title}</h3>
                      <p className="step-description">{step.description}</p>
                      {step.duration > 0 && (
                        <div className="step-duration">⏱ 预计 {formatTime(step.duration)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="recipe-sidebar">
            <TimerPanel
              recipeId={recipe.id}
              recipeTitle={recipe.title}
              steps={recipe.steps}
              socket={socket}
              activeSession={activeSession}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
