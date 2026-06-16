import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import SearchPanel from './components/SearchPanel';
import RecipeCard from './components/RecipeCard';
import NutritionTracker from './components/NutritionTracker';
import type { Recipe } from './types';

function App() {
  const state = useAppState();
  const location = useLocation();
  const isFavoritesPage = location.pathname === '/favorites';

  const handleSearch = (ingredients: string[], goal: any) => {
    state.handleSearch(ingredients, goal);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <span className="brand-icon">🍳</span>
            <h1 className="brand-title">智能食谱与营养追踪</h1>
          </div>
          <nav className="nav-tabs">
            <Link
              to="/"
              className={`nav-link ${!isFavoritesPage ? 'active' : ''}`}
            >
              🔍 食谱搜索
            </Link>
            <Link
              to="/favorites"
              className={`nav-link ${isFavoritesPage ? 'active' : ''}`}
            >
              ⭐ 我的收藏
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="main-content">
          <div className="content-area">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <SearchPanel
                      onSearch={handleSearch}
                      initialIngredients={state.searchIngredients}
                      initialGoal={state.dietGoal}
                    />
                    {state.loading ? (
                      <div className="loading-state">
                        <div className="spinner"></div>
                        <p>正在为您搜索美味食谱...</p>
                      </div>
                    ) : state.recipes.length > 0 ? (
                      <div className="recipe-grid">
                        {state.recipes.map((recipe: Recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            isFavorite={state.isFavorite(recipe.id)}
                            onView={state.handleRecipeView}
                            onToggleFavorite={state.handleToggleFavorite}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">🥗</div>
                        <h3>开始探索健康美食</h3>
                        <p>输入食材并选择饮食目标，让我们为您推荐美味食谱</p>
                      </div>
                    )}
                  </>
                }
              />
              <Route
                path="/favorites"
                element={
                  state.favorites.length > 0 ? (
                    <div className="recipe-grid">
                      {state.favorites.map((recipe: Recipe) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          isFavorite={true}
                          onView={state.handleRecipeView}
                          onToggleFavorite={state.handleToggleFavorite}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">⭐</div>
                      <h3>还没有收藏的食谱</h3>
                      <p>浏览食谱并点击收藏按钮，您的收藏将显示在这里</p>
                    </div>
                  )
                }
              />
            </Routes>
          </div>

          <aside className="sidebar">
            <NutritionTracker
              tracker={state.tracker}
              goals={state.goals}
              onRefresh={state.refreshTracker}
              onClear={state.handleClearTracker}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
