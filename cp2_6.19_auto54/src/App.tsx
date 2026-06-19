import { useState, useEffect, useCallback } from 'react'
import type { Recipe, RecommendedRecipe } from './types'
import IngredientInput from './IngredientInput'
import RecipeList from './RecipeList'
import RecommendResult from './RecommendResult'
import RecipeModal from './RecipeModal'

type TabType = 'all' | 'favorites'
type ViewType = 'browse' | 'recommend'

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredients] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [view, setView] = useState<ViewType>('browse')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)

  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data))
  }, [])

  const handleRecommend = useCallback(async () => {
    if (ingredients.length === 0) return
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients })
    })
    const data = await res.json()
    setRecommendations(data)
    setView('recommend')
  }, [ingredients])

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const displayRecipes = activeTab === 'favorites'
    ? recipes.filter(r => favorites.has(r.id))
    : recipes

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-emoji">🍳</span>
            <h1>智能食谱推荐</h1>
          </div>
          <div className="header-actions">
            <button
              className={`nav-btn ${view === 'browse' ? 'active' : ''}`}
              onClick={() => setView('browse')}
            >
              浏览菜谱
            </button>
            <button
              className="recommend-btn"
              onClick={handleRecommend}
              disabled={ingredients.length === 0}
            >
              🎯 推荐菜谱
            </button>
          </div>
        </div>
      </header>

      <div className="main-container">
        <aside className={`sidebar ${panelOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-toggle" onClick={() => setPanelOpen(!panelOpen)}>
            <span>{panelOpen ? '▼ 收起' : '▶ 展开食材面板'}</span>
          </div>
          {panelOpen && (
            <div className="sidebar-content">
              <div className="sidebar-section">
                <h3>🥬 我的食材</h3>
                <IngredientInput
                  ingredients={ingredients}
                  setIngredients={setIngredients}
                />
                <div className="ingredient-hint">
                  已添加 {ingredients.length} 种食材
                </div>
              </div>

              <div className="sidebar-section">
                <h3>📂 菜谱分类</h3>
                <div className="tabs">
                  <button
                    className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                  >
                    全部菜谱
                    <span className="tab-count">{recipes.length}</span>
                  </button>
                  <button
                    className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
                    onClick={() => setActiveTab('favorites')}
                  >
                    ⭐ 我的收藏
                    <span className="tab-count">{favorites.size}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="content">
          {view === 'browse' ? (
            <RecipeList
              recipes={displayRecipes}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onSelectRecipe={setSelectedRecipe}
              activeTab={activeTab}
            />
          ) : (
            <RecommendResult
              recommendations={recommendations}
              ingredients={ingredients}
              onSelectRecipe={setSelectedRecipe}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onBack={() => setView('browse')}
            />
          )}
        </main>
      </div>

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  )
}
