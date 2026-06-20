import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IngredientInputProps {
  ingredients: string[]
  onChange: (ingredients: string[]) => void
  placeholder?: string
}

export default function IngredientInput({
  ingredients,
  onChange,
  placeholder = '输入食材后按回车添加',
}: IngredientInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addIngredient()
    }
  }

  const addIngredient = () => {
    const value = inputValue.trim()
    if (value && !ingredients.includes(value)) {
      onChange([...ingredients, value])
      setInputValue('')
    }
  }

  const removeIngredient = (ingredient: string) => {
    onChange(ingredients.filter((i) => i !== ingredient))
  }

  const handleWrapperClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div className="ingredient-input-container">
      <div className="ingredient-input-wrapper" onClick={handleWrapperClick}>
        <AnimatePresence>
          {ingredients.map((ingredient) => (
            <motion.span
              key={ingredient}
              className="ingredient-tag"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {ingredient}
              <span
                className="ingredient-tag-remove"
                onClick={(e) => {
                  e.stopPropagation()
                  removeIngredient(ingredient)
                }}
              >
                ×
              </span>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          type="text"
          className="ingredient-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ingredients.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  )
}
