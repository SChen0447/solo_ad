import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Recipe } from '../types';
import { recipesAPI } from '../api';
import { useAuth } from '../AuthContext';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;
      try {
        const res = await recipesAPI.getById(id);
        setRecipe(res.data);
        if (user?.savedRecipes) {
          setIsSaved(user.savedRecipes.includes(id));
        }
      } catch (err: any) {
        setError(err.response?.data?.error || '加载食谱失败');
      } finally {
        setLoading(false);
      }
    };
    loadRecipe();
  }, [id, user]);

  const handleSave = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      if (isSaved) {
        await recipesAPI.unsave(id!);
      } else {
        await recipesAPI.save(id!);
      }
      setIsSaved(!isSaved);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container">
        <div className="error-message">{error || '食谱不存在'}</div>
        <button className="btn" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="container">
      <button
        className="btn btn-ghost"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        ← 返回
      </button>

      <img
        src={recipe.coverImage}
        alt={recipe.name}
        className="recipe-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
        }}
      />

      <div className="recipe-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h1>{recipe.name}</h1>
            {recipe.description && (
              <p className="recipe-description">{recipe.description}</p>
            )}
            <div className="recipe-tags">
              {recipe.tags.map(tag => (
                <span key={tag} className="recipe-tag">#{tag}</span>
              ))}
              <span className="recipe-tag">{recipe.category}</span>
            </div>
          </div>
          {token && (
            <button
              className={isSaved ? 'btn btn-outline' : 'btn'}
              onClick={handleSave}
            >
              {isSaved ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
          )}
        </div>
      </div>

      <div className="detail-layout">
        <div className="steps-section">
          <h3>📝 烹饪步骤</h3>
          {recipe.steps
            .sort((a, b) => a.order - b.order)
            .map(step => (
              <div key={step.id} className="step-item">
                <div className="step-number">{step.order}</div>
                <div className="step-content">
                  <p>{step.description}</p>
                  {step.imageUrl && (
                    <img
                      src={step.imageUrl}
                      alt={`步骤${step.order}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="ingredients-section">
          <h3>🥗 所需食材</h3>
          <div className="ingredients-list">
            {recipe.ingredients.map(ing => (
              <div key={ing.id} className="ingredient-row">
                <span className="name">{ing.name}</span>
                <span className="qty">{ing.quantity}</span>
                <span className="unit">{ing.unit}</span>
              </div>
            ))}
          </div>
          {recipe.authorName && (
            <div style={{ marginTop: 20, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              分享者：{recipe.authorName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
