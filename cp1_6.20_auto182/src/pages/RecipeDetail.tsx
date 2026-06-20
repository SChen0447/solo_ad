import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { recipeApi, type Recipe } from '../utils/api'

const CUISINE_MAP: Record<string, { label: string; className: string }> = {
  chinese: { label: '中餐', className: 'cuisine-chinese' },
  western: { label: '西餐', className: 'cuisine-western' },
  japanese: { label: '日料', className: 'cuisine-japanese' },
  southeast: { label: '东南亚', className: 'cuisine-southeast' },
  baking: { label: '烘焙', className: 'cuisine-baking' },
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [rating, setRating] = useState(0)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [tempRating, setTempRating] = useState(0)
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false)

  useEffect(() => {
    if (!id) return
    const recipeId = parseInt(id)
    recipeApi.getRecipe(recipeId).then((data) => {
      setRecipe(data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    setIsFavorite(favorites.includes(recipeId))

    const ratings = JSON.parse(localStorage.getItem('ratings') || '{}')
    if (ratings[recipeId]) {
      setRating(ratings[recipeId])
    }
  }, [id])

  const toggleFavorite = () => {
    if (!id) return
    setIsFavoriteAnimating(true)
    const recipeId = parseInt(id)
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')

    if (isFavorite) {
      const newFavorites = favorites.filter((fid: number) => fid !== recipeId)
      localStorage.setItem('favorites', JSON.stringify(newFavorites))
      setIsFavorite(false)
    } else {
      favorites.push(recipeId)
      localStorage.setItem('favorites', JSON.stringify(favorites))
      setIsFavorite(true)
    }

    setTimeout(() => setIsFavoriteAnimating(false), 300)
  }

  const openRatingModal = () => {
    setTempRating(rating)
    setShowRatingModal(true)
  }

  const submitRating = () => {
    if (!id) return
    const recipeId = parseInt(id)
    const ratings = JSON.parse(localStorage.getItem('ratings') || '{}')
    ratings[recipeId] = tempRating
    localStorage.setItem('ratings', JSON.stringify(ratings))
    setRating(tempRating)
    setShowRatingModal(false)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="page-container">
        <div className="empty">
          <div className="empty-icon">❓</div>
          <p>菜谱不存在</p>
        </div>
      </div>
    )
  }

  const cuisineInfo = CUISINE_MAP[recipe.cuisine] || { label: recipe.cuisine, className: '' }

  return (
    <div className="page-container">
      <div className="detail-container">
        <img src={recipe.image} alt={recipe.name} className="detail-image" />
        <div className="detail-content">
          <div className="detail-header">
            <div>
              <h1 className="detail-title">{recipe.name}</h1>
              <span className={`cuisine-badge ${cuisineInfo.className}`}>
                {cuisineInfo.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button
                className="action-btn"
                onClick={toggleFavorite}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className={`favorite-icon ${isFavorite ? 'active' : ''}`}
                  animate={isFavoriteAnimating ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {isFavorite ? '❤️' : '🤍'}
                </motion.span>
                <span>收藏</span>
              </motion.button>

              <motion.button
                className="action-btn"
                onClick={openRatingModal}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`star-icon ${s <= rating ? 'filled' : ''}`}>
                      ★
                    </span>
                  ))}
                </div>
                <span>评分</span>
              </motion.button>
            </div>
          </div>

          <div className="detail-section">
            <h3>食材清单</h3>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx}>
                  <span>{ing.name}</span>
                  <span>
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-section">
            <h3>制作步骤</h3>
            {recipe.steps.map((step, idx) => (
              <div key={idx} className="step-detail">
                <h4>第 {idx + 1} 步</h4>
                <p>{step.description}</p>
                {step.image && <img src={step.image} alt={`步骤${idx + 1}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRatingModal && (
          <motion.div
            className="rating-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowRatingModal(false)
            }}
          >
            <motion.div
              className="rating-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h3>为这道菜评分</h3>
              <div className="rating-modal-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={`rating-modal-star ${s <= tempRating ? 'filled' : ''}`}
                    onClick={() => setTempRating(s)}
                  >
                    ★
                  </span>
                ))}
              </div>
              <button className="rating-modal-btn" onClick={submitRating}>
                确认
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
