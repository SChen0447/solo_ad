import { useRef, useEffect, useState } from 'react'
import { useSearchStore } from './store'
import { useCollectionStore } from '../collection'
import './search.css'

export const SearchBar = () => {
  const query = useSearchStore((s) => s.query)
  const setQuery = useSearchStore((s) => s.setQuery)
  const clear = useSearchStore((s) => s.clear)
  const cards = useCollectionStore((s) => s.cards)

  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setShowResults(query.trim().length > 0)
  }, [query])

  const matchedCards = query.trim()
    ? cards.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : []

  return (
    <div className="search-container">
      <div className="search-box">
        <svg
          className="search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索卡片标题、描述或标签..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
        {query && (
          <button className="search-clear" onClick={clear}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {showResults && query.trim() && (
        <div className="search-results" onMouseDown={(e) => e.preventDefault()}>
          {matchedCards.length === 0 ? (
            <div className="search-empty">没有找到匹配的卡片</div>
          ) : (
            <>
              <div className="search-count">
                找到 {matchedCards.length} 个匹配项
              </div>
              <div className="search-list">
                {matchedCards.slice(0, 8).map((card) => (
                  <div key={card.id} className="search-result-item">
                    <img src={card.screenshot} alt="" className="search-result-img" />
                    <div className="search-result-info">
                      <div className="search-result-title">
                        {card.title.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                          part.toLowerCase() === query.toLowerCase() ? (
                            <mark key={i} className="highlight-text">
                              {part}
                            </mark>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                      <div className="search-result-desc">{card.description.slice(0, 60)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
