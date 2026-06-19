import type { Recipe, RecommendedRecipe } from './types'

interface Props {
  recommendations: RecommendedRecipe[]
  ingredients: string[]
  onSelectRecipe: (r: Recipe) => void
  favorites: Set<number>
  toggleFavorite: (id: number) => void
  onBack: () => void
}

export default function RecommendResult({
  recommendations,
  ingredients,
  onSelectRecipe,
  favorites,
  toggleFavorite,
  onBack
}: Props) {
  const userIngredientsLower = ingredients.map(i => i.toLowerCase())

  return (
    <div className="recommend-wrapper">
      <div className="recommend-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回浏览
        </button>
        <div className="recommend-title">
          <h2>🎯 为您推荐</h2>
          <p className="recommend-subtitle">
            根据您的 <strong>{ingredients.length}</strong> 种食材，找到{' '}
            <strong>{recommendations.length}</strong> 道匹配的菜谱
          </p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🤔</div>
          <p>没有找到匹配的菜谱，请添加更多食材试试！</p>
        </div>
      ) : (
        <div className="recommend-grid fade-in">
          {recommendations.map(recipe => {
            const stopProp = (e: React.MouseEvent) => e.stopPropagation()
            return (
              <div
                key={recipe.id}
                className="recommend-card"
                onClick={() => onSelectRecipe(recipe)}
              >
                <button
                  className={`favorite-btn ${favorites.has(recipe.id) ? 'favorited' : ''}`}
                  onClick={e => {
                    stopProp(e)
                    toggleFavorite(recipe.id)
                  }}
                  aria-label="收藏"
                >
                  <svg viewBox="0 0 24 24" className="star-icon">
                    <polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                      className="star-path"
                    />
                  </svg>
                </button>

                <div className="match-badge">
                  <div className="match-percent">{recipe.matchPercentage}%</div>
                  <div className="match-bar">
                    <div
                      className="match-fill"
                      style={{ width: `${recipe.matchPercentage}%` }}
                    />
                  </div>
                  <div className="match-text">
                    {recipe.matchedCount}/{recipe.totalIngredients} 食材匹配
                  </div>
                </div>

                <div className="recommend-card-header">
                  <span className="rec-emoji">{recipe.emoji}</span>
                  <h3 className="rec-name">{recipe.name}</h3>
                </div>

                <p className="rec-desc">{recipe.description}</p>

                <div className="rec-ingredients">
                  <h4 className="rec-section-title">所需食材：</h4>
                  <div className="rec-ing-list">
                    {recipe.ingredients.map(ing => {
                      const isMatched = userIngredientsLower.includes(
                        ing.name.toLowerCase()
                      )
                      return (
                        <span
                          key={ing.name}
                          className={`rec-ing-tag ${isMatched ? 'matched' : 'missing'}`}
                          title={isMatched ? '您已拥有此食材' : '缺少此食材'}
                        >
                          {ing.name}
                          <small>{ing.amount}</small>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
