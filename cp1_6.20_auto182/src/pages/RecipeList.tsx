import { useState, useEffect, useRef, useCallback } from 'react'
import RecipeCard from '../components/RecipeCard'
import { recipeApi, type Recipe } from '../utils/api'

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<HTMLDivElement>(null)
  const initialLoaded = useRef(false)

  const loadRecipes = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const data = await recipeApi.getRecipes(page, 8)
      if (data.length === 0 || data.length < 8) {
        setHasMore(false)
      }
      if (page === 1) {
        setRecipes(data)
      } else {
        setRecipes((prev) => [...prev, ...data])
      }
    } catch (err) {
      console.error('Failed to load recipes:', err)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [page, loading, hasMore])

  useEffect(() => {
    if (!initialLoaded.current) {
      initialLoaded.current = true
      loadRecipes()
    }
  }, [])

  useEffect(() => {
    if (page > 1) {
      loadRecipes()
    }
  }, [page])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading && recipes.length > 0) {
            setPage((prev) => prev + 1)
          }
        })
      },
      { rootMargin: '200px' }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, recipes.length])

  return (
    <div className="page-container">
      <h2 className="page-title">探索美食</h2>
      {recipes.length === 0 && loading ? (
        <div className="loading">加载中...</div>
      ) : recipes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🍳</div>
          <p>还没有菜谱，去发布第一道菜吧！</p>
        </div>
      ) : (
        <>
          <div className="masonry-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
          <div ref={observerRef} style={{ height: 20 }} />
          {loading && <div className="loading">加载更多...</div>}
          {!hasMore && recipes.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              没有更多了
            </div>
          )}
        </>
      )}
    </div>
  )
}
