import { useState, useEffect, useRef } from 'react'

interface Props {
  ingredients: string[]
  setIngredients: (list: string[]) => void
}

const TAG_COLORS = [
  '#E3F2FD',
  '#FCE4EC',
  '#E8F5E9',
  '#FFF3E0',
  '#F3E5F5',
  '#FFF8E1',
  '#E0F7FA',
  '#F1F8E9'
]

function getTagColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export default function IngredientInput({ ingredients, setIngredients }: Props) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [allIngredients, setAllIngredients] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [removingIdx, setRemovingIdx] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/ingredients')
      .then(res => res.json())
      .then(data => setAllIngredients(data))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInputChange = (v: string) => {
    setValue(v)
    if (v.trim()) {
      const lower = v.toLowerCase()
      const filtered = allIngredients.filter(
        i =>
          i.toLowerCase().includes(lower) &&
          !ingredients.map(x => x.toLowerCase()).includes(i.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const addIngredient = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (ingredients.map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      setValue('')
      setSuggestions([])
      return
    }
    setIngredients([...ingredients, trimmed])
    setValue('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault()
      if (suggestions.length > 0) {
        addIngredient(suggestions[0])
      } else if (value.trim()) {
        addIngredient(value)
      }
    }
  }

  const removeIngredient = (idx: number) => {
    setRemovingIdx(idx)
    setTimeout(() => {
      setIngredients(ingredients.filter((_, i) => i !== idx))
      setRemovingIdx(null)
    }, 200)
  }

  return (
    <div className="ingredient-input-wrapper" ref={wrapperRef}>
      <div className="input-container">
        <input
          type="text"
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && setShowSuggestions(true)}
          placeholder="输入食材名称，回车添加..."
          className="ingredient-input"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-dropdown">
            {suggestions.slice(0, 8).map(s => (
              <li
                key={s}
                className="suggestion-item"
                onClick={() => addIngredient(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="ingredient-tags">
        {ingredients.map((ing, idx) => (
          <span
            key={ing}
            className={`ingredient-tag ${removingIdx === idx ? 'removing' : ''}`}
            style={{ backgroundColor: getTagColor(ing) }}
          >
            {ing}
            <button
              className="tag-remove"
              onClick={() => removeIngredient(idx)}
              aria-label={`删除${ing}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
