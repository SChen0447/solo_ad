import { useState, useEffect } from 'react';
import { useRecipeStore } from '../store/recipeStore';
import { RecipeCard } from '../components/RecipeCard';
import { CreateRecipeModal } from '../components/CreateRecipeModal';
import './HomePage.css';

export function HomePage() {
  const fetchRecipes = useRecipeStore(s => s.fetchRecipes);
  const searchQuery = useRecipeStore(s => s.searchQuery);
  const setSearchQuery = useRecipeStore(s => s.setSearchQuery);
  const getFilteredRecipes = useRecipeStore(s => s.getFilteredRecipes);
  const loading = useRecipeStore(s => s.loading);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRecipeId, setNewRecipeId] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [displayedRecipes, setDisplayedRecipes] = useState(getFilteredRecipes());

  const allRecipes = getFilteredRecipes();

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setDisplayedRecipes(allRecipes);
      setIsFiltering(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, allRecipes.length > 0 ? allRecipes.map(r => r.id).join(',') : '']);

  const handleCreated = () => {
    const recipes = useRecipeStore.getState().recipes;
    if (recipes.length > 0) {
      setNewRecipeId(recipes[0].id);
      setTimeout(() => setNewRecipeId(null), 600);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header__inner">
          <div className="home-header__brand">
            <i className="fa-solid fa-utensils home-header__icon"></i>
            <h1 className="home-header__title">食谱营养厨房</h1>
          </div>
          <button
            className="home-header__create-btn"
            onClick={() => setModalOpen(true)}
          >
            <i className="fa-solid fa-plus"></i>
            创建食谱
          </button>
        </div>
      </header>

      <div className="app-container">
        <div className="search-section">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-box__icon"></i>
            <input
              type="text"
              placeholder="搜索食谱..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-box__input"
            />
            {searchQuery && (
              <button
                className="search-box__clear"
                onClick={() => setSearchQuery('')}
                aria-label="清除搜索"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>

        {loading && displayedRecipes.length === 0 ? (
          <div className="loading-state">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>加载中...</p>
          </div>
        ) : displayedRecipes.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><i className="fa-regular fa-face-frown"></i></div>
            <h3>{searchQuery ? '没有找到匹配的食谱' : '还没有食谱'}</h3>
            <p>{searchQuery ? '试试其他关键词吧' : '点击右上角「创建食谱」开始添加'}</p>
          </div>
        ) : (
          <div className={`recipe-grid ${isFiltering ? 'fading' : ''}`}>
            {displayedRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isNew={recipe.id === newRecipeId}
              />
            ))}
          </div>
        )}
      </div>

      <CreateRecipeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
