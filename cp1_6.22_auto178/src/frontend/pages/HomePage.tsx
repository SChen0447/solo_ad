import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types';
import { recipesAPI } from '../api';

const availableTags = ['辣', '甜', '快手菜', '家常', '下饭菜', '硬菜', '酸甜'];

export default function HomePage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [category, setCategory] = useState('');

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const res = await recipesAPI.getAll({
        search: search || undefined,
        category: category || undefined,
        tag: activeTag || undefined,
      });
      setRecipes(res.data);
    } catch (err) {
      console.error('加载食谱失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecipes();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeTag, category]);

  return (
    <div className="container">
      <h1 className="page-title">🍳 美食食谱库</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索菜名或食材..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ minWidth: 140 }}
        >
          <option value="">全部分类</option>
          <option value="家常菜">家常菜</option>
          <option value="川菜">川菜</option>
          <option value="粤菜">粤菜</option>
          <option value="烘焙">烘焙</option>
          <option value="汤品">汤品</option>
        </select>
        <button className="btn btn-outline" onClick={() => navigate('/smart')}>
          🍽️ 智能推荐
        </button>
      </div>

      <div className="tag-list">
        <span
          className={`tag ${!activeTag ? 'active' : ''}`}
          onClick={() => setActiveTag('')}
        >
          全部
        </span>
        {availableTags.map(tag => (
          <span
            key={tag}
            className={`tag ${activeTag === tag ? 'active' : ''}`}
            onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
          >
            {tag}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p>加载中...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>没有找到匹配的食谱</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            >
              <img
                src={recipe.coverImage}
                alt={recipe.name}
                className="recipe-card-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
                }}
              />
              <div className="recipe-card-body">
                <div>
                  <div className="recipe-card-name">{recipe.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {recipe.ingredients.length} 种食材 · {recipe.steps.length} 步
                  </div>
                </div>
                {recipe.authorName && (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    by {recipe.authorName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
