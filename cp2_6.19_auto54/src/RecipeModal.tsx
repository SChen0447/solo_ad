import { useEffect, useRef } from 'react'
import type { Recipe } from './types'

interface Props {
  recipe: Recipe
  onClose: () => void
}

export default function RecipeModal({ recipe, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)

  useEffect(() => {
    if (!overlayRef.current) return
    requestAnimationFrame(() => {
      overlayRef.current?.classList.add('modal-overlay-visible')
      contentRef.current?.classList.add('modal-content-visible')
    })
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [])

  const handleClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    const overlay = overlayRef.current
    const content = contentRef.current
    if (!overlay || !content) {
      onClose()
      return
    }
    overlay.classList.remove('modal-overlay-visible')
    content.classList.remove('modal-content-visible')

    const handleEnd = () => {
      content.removeEventListener('transitionend', handleEnd)
      onClose()
    }
    content.addEventListener('transitionend', handleEnd)
    setTimeout(() => {
      content.removeEventListener('transitionend', handleEnd)
      if (closingRef.current) onClose()
    }, 350)
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={handleClose}
    >
      <div
        ref={contentRef}
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose} aria-label="关闭">
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
