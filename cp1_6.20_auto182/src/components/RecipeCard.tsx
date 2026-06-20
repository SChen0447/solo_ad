import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Recipe } from '../utils/api'

const CUISINE_MAP: Record<string, { label: string; className: string }> = {
  chinese: { label: '中餐', className: 'cuisine-chinese' },
  western: { label: '西餐', className: 'cuisine-western' },
  japanese: { label: '日料', className: 'cuisine-japanese' },
  southeast: { label: '东南亚', className: 'cuisine-southeast' },
  baking: { label: '烘焙', className: 'cuisine-baking' },
}

interface RecipeCardProps {
  recipe: Recipe
  matchRate?: number
}

const getGradientColor = (percent: number) => {
  const r1 = 231, g1 = 76, b1 = 60
  const r2 = 46, g2 = 204, b2 = 113
  const t = percent / 100
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export default function RecipeCard({ recipe, matchRate }: RecipeCardProps) {
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(false)
  const [rating, setRating] = useState(0)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [tempRating, setTempRating] = useState(0)
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    setIsFavorite(favorites.includes(recipe.id))

    const ratings = JSON.parse(localStorage.getItem('ratings') || '{}')
    if (ratings[recipe.id]) {
      setRating(ratings[recipe.id])
    }
  }, [recipe.id])

  useEffect(() => {
    if (imgRef.current && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              if (img.dataset.src) {
                img.src = img.dataset.src
                img.onload = () => {
                  setImageLoaded(true)
                }
                observer.unobserve(img)
              }
            }
          })
        },
        { rootMargin: '100px' }
      )

      observer.observe(imgRef.current)

      return () => observer.disconnect()
    } else if (imgRef.current) {
      imgRef.current.src = recipe.image
    }
  }, [recipe.image])

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFavoriteAnimating(true)
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')

    if (isFavorite) {
      const newFavorites = favorites.filter((id: number) => id !== recipe.id)
      localStorage.setItem('favorites', JSON.stringify(newFavorites))
      setIsFavorite(false)
    } else {
      favorites.push(recipe.id)
      localStorage.setItem('favorites', JSON.stringify(favorites))
      setIsFavorite(true)
    }

    setTimeout(() => setIsFavoriteAnimating(false), 300)
  }

  const openRatingModal = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTempRating(rating)
    setShowRatingModal(true)
  }

  const submitRating = () => {
    const ratings = JSON.parse(localStorage.getItem('ratings') || '{}')
    ratings[recipe.id] = tempRating
    localStorage.setItem('ratings', JSON.stringify(ratings))
    setRating(tempRating)
    setShowRatingModal(false)
  }

  const cuisineInfo = CUISINE_MAP[recipe.cuisine] || { label: recipe.cuisine, className: '' }

  const ingredientSummary = recipe.ingredients.slice(0, 3).map((i) => i.name).join('、')
  const moreCount = recipe.ingredients.length - 3

  const handleClick = () => {
    navigate(`/recipes/${recipe.id}`)
  }

  return (
    <>
      <motion.div
        className="recipe-card"
        onClick={handleClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ position: 'relative', width: '100%', height: 200, background: '#eee' }}>
          <img
            ref={imgRef}
            data-src={recipe.image}
            alt={recipe.name}
            className="recipe-card-image"
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
          />
          {!imageLoaded && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ccc',
              fontSize: 24,
            }}>
              🍽️
            </div>
          )}
        </div>

        <div className="recipe-card-content">
          <div className="recipe-card-name" title={recipe.name}>{recipe.name}</div>
          <span className={`cuisine-badge ${cuisineInfo.className}`}>{cuisineInfo.label}</span>

          {matchRate !== undefined && (
            <div className="match-bar-container">
              <div className="match-bar">
                <div
                  className="match-bar-fill"
                  style={{
                    width: `${matchRate * 100}%`,
                    background: getGradientColor(matchRate * 100),
                  }}
                />
              </div>
              <span className="match-percent">{Math.round(matchRate * 100)}%</span>
            </div>
          )}

          <div className="recipe-card-ingredients">
            {ingredientSummary}
            {moreCount > 0 && ` 等${recipe.ingredients.length}种`}
          </div>

          <div className="recipe-card-actions">
            <button className="action-btn" onClick={toggleFavorite}>
              <motion.span
                className={`favorite-icon ${isFavorite ? 'active' : ''}`}
                animate={isFavoriteAnimating ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {isFavorite ? '❤️' : '🤍'}
              </motion.span>
              <span>收藏</span>
            </button>

            <button className="action-btn" onClick={openRatingModal}>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`star-icon ${s <= rating ? 'filled' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
              <span>评分</span>
            </button>
          </div>
        </div>
      </motion.div>

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
    </>
  )
}
