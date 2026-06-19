import { useMemo, useState, useEffect, useRef } from 'react'
import type { Recipe } from './types'

interface Props {
  recipes: Recipe[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  favorites: Set<number>
  toggleFavorite: (id: number) => void
  onSelectRecipe: (r: Recipe) => void
  activeTab: 'all' | 'favorites'
}

export default function RecipeList({
  recipes,
  searchQuery,
  setSearchQuery,
  favorites,
  toggleFavorite,
  onSelectRecipe,
  activeTab
}: Props) {
  const [displayed, setDisplayed] = useState<Recipe[]>(recipes)
  const [animating, setAnimating] = useState(false)
  const [tabSwitching, setTabSwitching] = useState(false)
  const prevTabRef = useRef(activeTab)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return recipes
    const q = searchQuery.toLowerCase().trim()
    return recipes.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q))
    )
  }, [recipes, searchQuery])

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab
      setTabSwitching(true)
      const timer = setTimeout(() => setTabSwitching(false), 350)
      return () => clearTimeout(timer)
    }
  }, [activeTab])

  useEffect(() => {
    setAnimating(true)
    const timer = setTimeout(() => {
      setDisplayed(filtered)
      setAnimating(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [filtered])

  return (
    <div className="recipe-list-wrapper">
      <div className="list-header">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索菜谱名称、描述或食材..."
            className="search-input"
          />
        </div>
        <div className="result-count">
          共 <strong>{filtered.length}</strong> 道菜谱
        </div>
      </div>

      <div className={`recipe-grid ${animating ? 'fade-out' : 'fade-in'} ${tabSwitching ? 'tab-slide' : ''}`}>
        {displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-emoji">🍽️</div>
            <p>
              {activeTab === 'favorites'
                ? '还没有收藏的菜谱，快去收藏一些吧！'
                : '没有找到匹配的菜谱，换个关键词试试？'}
            </p>
          </div>
        ) : (
          displayed.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={favorites.has(recipe.id)}
              toggleFavorite={toggleFavorite}
              onClick={() => onSelectRecipe(recipe)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface CardProps {
  recipe: Recipe
  isFavorite: boolean
  toggleFavorite: (id: number) => void
  onClick: () => void
}

function RecipeCard({ recipe, isFavorite, toggleFavorite, onClick }: CardProps) {
  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className="recipe-card" onClick={onClick}>
      <button
        className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
        onClick={e => {
          stopProp(e)
          toggleFavorite(recipe.id)
        }}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        <svg viewBox="0 0 24 24" className="star-icon">
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            className="star-path"
          />
        </svg>
      </button>

      <div className="recipe-image">
        <div className="emoji-bg" style={{ backgroundColor: '#E0E0E0' }}>
          <span className="recipe-emoji">{recipe.emoji}</span>
        </div>
      </div>

      <div className="recipe-body">
        <h3 className="recipe-name">{recipe.name}</h3>
        <p className="recipe-desc">{recipe.description}</p>
        <div className="recipe-ingredients">
          {recipe.ingredients.slice(0, 4).map(ing => (
            <span key={ing.name} className="mini-ing-tag">
              {ing.name}
            </span>
          ))}
          {recipe.ingredients.length > 4 && (
            <span className="mini-ing-tag more">
              +{recipe.ingredients.length - 4}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
