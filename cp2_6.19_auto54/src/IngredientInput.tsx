import { useState, useEffect, useRef, useMemo } from 'react'

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

const FALLBACK_INGREDIENTS = [
  '番茄', '鸡蛋', '盐', '糖', '葱', '五花肉', '酱油', '冰糖', '料酒', '姜',
  '八角', '青菜', '蒜', '油', '豆腐', '牛肉末', '豆瓣酱', '花椒粉',
  '鸡胸肉', '花生米', '干辣椒', '花椒', '牛肉', '土豆', '胡萝卜', '洋葱',
  '西兰花', '猪里脊肉', '淀粉', '番茄酱', '醋', '黄瓜', '香油', '面条',
  '青椒', '鸡翅', '可乐'
]

function getTagColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const lower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  const idx = lower.indexOf(queryLower)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong className="suggestion-highlight">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function IngredientInput({ ingredients, setIngredients }: Props) {
  const [value, setValue] = useState('')
  const [allIngredients, setAllIngredients] = useState<string[]>(FALLBACK_INGREDIENTS)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [removingIdx, setRemovingIdx] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/ingredients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAllIngredients(data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const suggestions = useMemo(() => {
    if (!value.trim()) return []
    const lower = value.toLowerCase()
    const existingLower = ingredients.map(x => x.toLowerCase())
    return allIngredients.filter(
      i => i.toLowerCase().includes(lower) && !existingLower.includes(i.toLowerCase())
    )
  }, [value, allIngredients, ingredients])

  const handleInputChange = (v: string) => {
    setValue(v)
    setActiveIndex(-1)
    if (v.trim()) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const addIngredient = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (ingredients.map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      setValue('')
      setShowSuggestions(false)
      setActiveIndex(-1)
      return
    }
    setIngredients([...ingredients, trimmed])
    setValue('')
    setShowSuggestions(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
      }
    } else if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        addIngredient(suggestions[activeIndex])
      } else if (suggestions.length > 0) {
        addIngredient(suggestions[0])
      } else if (value.trim()) {
        addIngredient(value)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveIndex(-1)
    }
  }

  const removeIngredient = (idx: number) => {
    setRemovingIdx(idx)
    setTimeout(() => {
      setIngredients(ingredients.filter((_, i) => i !== idx))
      setRemovingIdx(null)
    }, 200)
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.children
      if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  return (
    <div className="ingredient-input-wrapper" ref={wrapperRef}>
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.trim()) setShowSuggestions(true)
          }}
          placeholder="输入食材名称，回车添加..."
          className="ingredient-input"
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-dropdown" ref={listRef}>
            {suggestions.slice(0, 8).map((s, idx) => (
              <li
                key={s}
                className={`suggestion-item ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => addIngredient(s)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className="suggestion-icon">🥕</span>
                <span className="suggestion-text">{highlightMatch(s, value)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="ingredient-tags">
        {ingredients.map((ing, idx) => (
          <span
            key={`${ing}-${idx}`}
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
