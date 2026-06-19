import { useEffect, useRef } from 'react'
import type { Recipe } from './types'

interface Props {
  recipe: Recipe
  onClose: () => void
}

export default function RecipeModal({ recipe, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        ref={modalRef}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className="modal-header">
          <div className="modal-emoji">{recipe.emoji}</div>
          <div>
            <h2 className="modal-title">{recipe.name}</h2>
            <p className="modal-desc">{recipe.description}</p>
          </div>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3 className="modal-section-title">🥕 所需食材</h3>
            <ul className="ingredient-list">
              {recipe.ingredients.map(ing => (
                <li key={ing.name} className="ingredient-item">
                  <span className="ingredient-dot" />
                  <span className="ingredient-name">{ing.name}</span>
                  <span className="ingredient-amount">{ing.amount}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="modal-section">
            <h3 className="modal-section-title">👨‍🍳 烹饪步骤</h3>
            <ol className="steps-list">
              {recipe.steps.map((step, idx) => (
                <li key={idx} className="step-item">
                  <span className="step-number">{idx + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
