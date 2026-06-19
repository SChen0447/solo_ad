import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import IngredientConverter from '../components/IngredientConverter';
import CommentSection from '../components/CommentSection';
import { useUser } from '../context/UserContext';
import './RecipeDetail.css';

interface Ingredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  image: string;
  sort_order: number;
}

interface Comment {
  id: number;
  recipe_id: number;
  user_id: number;
  parent_id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
  replies?: Comment[];
}

interface RecipeDetailData {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  total_time: number;
  tags: string;
  likes: number;
  views: number;
  author_name: string;
  author_avatar: string;
  user_id: number;
  ingredients: Ingredient[];
  steps: Step[];
}

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useUser();
  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (id) {
      fetchRecipe();
      fetchComments();
    }
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      const data = await res.json();
      if (data.success) {
        setRecipe(data.data);
      }
    } catch (err) {
      console.error('获取菜谱详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/recipes/${id}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data);
      }
    } catch (err) {
      console.error('获取评论失败', err);
    }
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/recipes/${id}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success && recipe) {
        setRecipe({ ...recipe, likes: data.data.likes });
      }
    } catch (err) {
      console.error('点赞失败', err);
    }
  };

  const handleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) {
        await fetch(`/api/users/favorites/${id}`, { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await fetch(`/api/users/favorites/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating }),
        });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('收藏操作失败', err);
    }
  };

  const handleSubmitComment = async (content: string, parentId?: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/recipes/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId: parentId || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        fetchComments();
      }
    } catch (err) {
      console.error('发表评论失败', err);
    }
  };

  const handleRating = async (newRating: number) => {
    if (!user) return;
    setRating(newRating);
    if (isFavorite) {
      try {
        await fetch(`/api/users/favorites/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: newRating }),
        });
      } catch (err) {
        console.error('评分失败', err);
      }
    }
  };

  if (loading) {
    return <div className="recipe-detail-loading">加载中...</div>;
  }

  if (!recipe) {
    return <div className="recipe-detail-loading">菜谱不存在</div>;
  }

  const tagList = recipe.tags ? recipe.tags.split(',').filter((t) => t) : [];

  return (
    <div className="recipe-detail-page">
      <div className="recipe-header">
        <div className="recipe-cover">
          {recipe.thumbnail ? (
            <img src={recipe.thumbnail} alt={recipe.title} />
          ) : (
            <div className="cover-placeholder">
              <span>🍲</span>
            </div>
          )}
        </div>
        <div className="recipe-info">
          <h1 className="recipe-title">{recipe.title}</h1>
          <p className="recipe-desc">{recipe.description}</p>

          {tagList.length > 0 && (
            <div className="recipe-tags">
              {tagList.map((tag, i) => (
                <span key={i} className="recipe-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="recipe-meta">
            <div className="meta-item">
              <span className="meta-icon">⏱️</span>
              <span className="meta-value">{recipe.total_time} 分钟</span>
              <span className="meta-label">总时长</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">🍽️</span>
              <span className="meta-value">{recipe.servings} 人份</span>
              <span className="meta-label">份量</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">👁️</span>
              <span className="meta-value">{recipe.views}</span>
              <span className="meta-label">浏览</span>
            </div>
          </div>

          <div className="recipe-actions">
            <button className="action-btn like-btn" onClick={handleLike}>
              <span>❤️</span>
              <span>点赞 {recipe.likes}</span>
            </button>
            <button
              className={`action-btn fav-btn ${isFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
            >
              <span>{isFavorite ? '⭐' : '☆'}</span>
              <span>{isFavorite ? '已收藏' : '收藏'}</span>
            </button>

            {user && (
              <div className="rating-section">
                <span className="rating-label">评分：</span>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${
                        star <= (hoverRating || rating) ? 'filled' : ''
                      }`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link to={`/profile/${recipe.user_id}`} className="author-info">
            <div className="author-avatar">
              {recipe.author_avatar ? (
                <img src={recipe.author_avatar} alt={recipe.author_name} />
              ) : (
                <div className="avatar-placeholder">
                  {recipe.author_name?.charAt(0)}
                </div>
              )}
            </div>
            <span className="author-name">{recipe.author_name}</span>
          </Link>
        </div>
      </div>

      <div className="recipe-body">
        <div className="ingredients-section">
          <IngredientConverter
            ingredients={recipe.ingredients}
            defaultServings={recipe.servings}
          />
        </div>

        <div className="steps-section">
          <h2 className="section-title">📝 制作步骤</h2>
          <div className="steps-list">
            {recipe.steps.map((step, index) => (
              <div key={step.id || index} className="step-item fade-in">
                <div className="step-number">{index + 1}</div>
                <div className="step-content">
                  {step.title && <h3 className="step-title">{step.title}</h3>}
                  <p className="step-desc">{step.description}</p>
                  {step.image && (
                    <div className="step-image">
                      <img src={step.image} alt={step.title || `步骤${index + 1}`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CommentSection comments={comments} onSubmit={handleSubmitComment} />
    </div>
  );
};

export default RecipeDetail;
