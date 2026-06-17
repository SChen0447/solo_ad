import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Loader2, FileText } from 'lucide-react'
import DocCard from '../components/DocCard'
import { fetchDocs, DocItem, SEARCH_DEBOUNCE_MS, getFavorites, toggleFavorite } from '../api/docSearch'
import useDebounce from '../hooks/useDebounce'

const TECH_STACKS = [
  { name: 'React', value: 'React', color: 'react' },
  { name: 'TypeScript', value: 'TypeScript', color: 'typescript' },
  { name: 'Tailwind CSS', value: 'Tailwind CSS', color: 'tailwind' },
]

function SearchPage() {
  const [query, setQuery] = useState('')
  const [selectedTechs, setSelectedTechs] = useState<string[]>(['React', 'TypeScript', 'Tailwind CSS'])
  const [results, setResults] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(false)
  const [bookmarks, setBookmarks] = useState<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
  const debouncedTechs = useDebounce(selectedTechs, SEARCH_DEBOUNCE_MS)

  const refreshBookmarks = useCallback(() => {
    setBookmarks(getFavorites())
  }, [])

  useEffect(() => {
    refreshBookmarks()
    window.addEventListener('bookmarkChange', refreshBookmarks)
    return () => window.removeEventListener('bookmarkChange', refreshBookmarks)
  }, [refreshBookmarks])

  const toggleBookmark = useCallback((id: number) => {
    toggleFavorite(id)
    setBookmarks(getFavorites())
  }, [])

  const performSearch = useCallback(async (searchQuery: string, techs: string[]) => {
    setLoading(true)
    try {
      const data = await fetchDocs(searchQuery, techs)
      setResults(data)
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    performSearch(debouncedQuery, debouncedTechs)
  }, [debouncedQuery, debouncedTechs, performSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch(query, selectedTechs)
    }
  }

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) => {
      if (prev.includes(tech)) {
        return prev.filter((t) => t !== tech)
      } else {
        return [...prev, tech]
      }
    })
  }

  return (
    <div className="page-container">
      <aside className="sidebar">
        <h3 className="sidebar-title">技术栈</h3>
        <div className="tech-tags">
          {TECH_STACKS.map((tech) => (
            <button
              key={tech.value}
              className={`tech-tag ${selectedTechs.includes(tech.value) ? 'selected' : ''}`}
              onClick={() => toggleTech(tech.value)}
            >
              <span className={`tech-tag-dot ${tech.color}`} />
              {tech.name}
            </button>
          ))}
        </div>
      </aside>

      <div className="content-area">
        <div className="search-header">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="搜索文档，如 useState、interface..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {loading ? (
              <Loader2 className="spinner search-icon" style={{ right: 14, left: 'auto' }} />
            ) : query ? (
              <button className="search-clear-btn" onClick={handleClear}>
                <X size={18} />
              </button>
            ) : null}
          </div>

          <div className="mobile-tech-tags">
            {TECH_STACKS.map((tech) => (
              <button
                key={tech.value}
                className={`tech-tag ${selectedTechs.includes(tech.value) ? 'selected' : ''}`}
                onClick={() => toggleTech(tech.value)}
              >
                <span className={`tech-tag-dot ${tech.color}`} />
                {tech.name}
              </button>
            ))}
          </div>

          <div className="results-info">
            {loading ? '搜索中...' : `共找到 ${results.length} 条结果`}
          </div>
        </div>

        {loading && results.length === 0 ? (
          <div className="loading-container">
            <Loader2 className="spinner" />
          </div>
        ) : results.length > 0 ? (
          <div className="cards-grid">
            {results.map((doc) => (
              <DocCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                description={doc.description}
                codeSnippet={doc.codeSnippet}
                techStack={doc.techStack}
                isBookmarked={bookmarks.includes(doc.id)}
                onBookmarkToggle={toggleBookmark}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <p className="empty-state-text">
              {query ? '没有找到相关文档' : '输入关键词开始搜索'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
