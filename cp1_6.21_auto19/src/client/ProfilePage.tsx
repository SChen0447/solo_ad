import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';
import RecipeCard from './RecipeCard';
import type { Recipe, CookingHistory } from './types';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites' | 'history'>('recipes');
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<CookingHistory[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [recipesData, favoritesData, historyData] = await Promise.all([
          api.recipes.myRecipes(),
          api.favorites.list(),
          api.history.list(),
        ]);
        setMyRecipes(recipesData);
        setFavorites(favoritesData);
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="profile-loading">加载中...</div>;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user.username.charAt(0)}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.username}</h1>
            <p className="profile-joined">加入于 {formatDate(user.createdAt)}</p>
          </div>
          <Link to="/create-recipe" className="btn-create-recipe">
            + 发布食谱
          </Link>
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            我的食谱
            <span className="tab-count">{myRecipes.length}</span>
          </button>
          <button
            className={`profile-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            我的收藏
            <span className="tab-count">{favorites.length}</span>
          </button>
          <button
            className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            烹饪历史
            <span className="tab-count">{history.length}</span>
          </button>
        </div>

        <div className="profile-content">
          {loadingData ? (
            <div className="profile-loading">加载中...</div>
          ) : activeTab === 'recipes' ? (
            <div className="profile-recipes">
              {myRecipes.length === 0 ? (
                <div className="empty-profile">
                  <p>📝 还没有发布食谱</p>
                  <Link to="/create-recipe" className="btn-primary-link">
                    发布第一个食谱
                  </Link>
                </div>
              ) : (
                <div className="recipe-grid">
                  {myRecipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'favorites' ? (
            <div className="profile-favorites">
              {favorites.length === 0 ? (
                <div className="empty-profile">
                  <p>❤️ 还没有收藏食谱</p>
                  <Link to="/" className="btn-primary-link">
                    去发现美食
                  </Link>
                </div>
              ) : (
                <div className="recipe-grid">
                  {favorites.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="profile-history">
              {history.length === 0 ? (
                <div className="empty-profile">
                  <p>🍳 还没有烹饪记录</p>
                  <Link to="/" className="btn-primary-link">
                    开始烹饪吧
                  </Link>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-icon">🍽️</div>
                      <div className="history-content">
                        <Link to={`/recipe/${item.recipeId}`} className="history-title">
                          {item.recipeTitle}
                        </Link>
                        <div className="history-date">
                          完成于 {formatDate(item.completedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
