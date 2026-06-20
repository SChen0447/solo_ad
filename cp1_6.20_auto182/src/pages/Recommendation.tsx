import { useState, useEffect } from 'react'
import IngredientInput from '../components/IngredientInput'
import RecipeCard from '../components/RecipeCard'
import { recipeApi, type RecipeWithMatch } from '../utils/api'

export default function Recommendation() {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [recipes, setRecipes] = useState<RecipeWithMatch[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ingredients.length === 0) {
      setRecipes([])
      return
    }

    const timer = setTimeout(() => {
      loadRecommendations()
    }, 300)

    return () => clearTimeout(timer)
  }, [ingredients])

  const loadRecommendations = async () => {
    if (ingredients.length === 0) return
    setLoading(true)
    try {
      const data = await recipeApi.recommend(ingredients)
      setRecipes(data)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">智能推荐</h2>
      <p style={{ marginBottom: 16, color: '#7f8c8d' }}>
        输入你家里现有的食材，系统会为你推荐能做的菜谱
      </p>

      <div className="recommend-section">
        <IngredientInput
          ingredients={ingredients}
          onChange={setIngredients}
          placeholder="输入食材名称，按回车添加"
        />
      </div>

      {loading && <div className="loading">正在匹配菜谱...</div>}

      {!loading && ingredients.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🥗</div>
          <p>添加食材开始智能推荐</p>
        </div>
      )}

      {!loading && ingredients.length > 0 && recipes.length === 0 && (
        <div className="empty">
          <div className="empty-icon">😔</div>
          <p>没有找到匹配度超过 50% 的菜谱</p>
          <p style={{ marginTop: 8, fontSize: 13 }}>试试添加更多食材？</p>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <>
          <p style={{ marginBottom: 12, color: '#7f8c8d' }}>
            共找到 {recipes.length} 道可以尝试的菜谱
          </p>
          <div className="masonry-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} matchRate={recipe.matchRate} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
