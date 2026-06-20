import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, SearchResult } from '../data/store'

function highlight(text: string, query: string): string {
  const q = query.trim()
  if (!q) return text
  const parts = q.split(/\s+/).filter(Boolean)
  const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.replace(regex, '<span class="hl">$1</span>')
}

export default function SearchBar() {
  const { searchDocuments } = useApp()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])

  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasQuery = query.trim().length > 0

  /* 200ms 防抖 */
  useEffect(() => {
    if (!hasQuery) {
      setResults([])
      setActiveIdx(0)
      return
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const res = searchDocuments(query)
      setResults(res)
      setActiveIdx(0)
    }, 200)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query, hasQuery, searchDocuments])

  /* ESC / 点击外部关闭 */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const goDoc = (id: string) => {
    setOpen(false)
    navigate(`/doc/${id}`)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length === 0) return
      setActiveIdx((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length === 0) return
      setActiveIdx((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      if (results[activeIdx]) {
        e.preventDefault()
        goDoc(results[activeIdx].docId)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const clearQuery = () => {
    setQuery('')
    setResults([])
    setActiveIdx(0)
    inputRef.current?.focus()
  }

  const showDropdown = open && hasQuery

  return (
    <div className="search-wrap" ref={wrapRef}>
      <div className="search-input-wrap">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="搜索文档、关键字或代码片段…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={onKey}
          aria-label="全局搜索"
          autoComplete="off"
          spellCheck={false}
        />
        {hasQuery && (
          <button className="search-clear" onClick={clearQuery} title="清除搜索" aria-label="清除搜索">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      <div
        className={`search-dropdown ${showDropdown ? 'open' : ''}`}
        role="listbox"
        aria-expanded={showDropdown}
      >
        {showDropdown && (
          <>
            <div className="search-dropdown-header">
              <span>🔍 找到 {results.length} 条结果</span>
              <span>↑↓ 选择 · ↵ 打开 · Esc 关闭</span>
            </div>
            {results.length === 0 ? (
              <div className="search-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="7"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <div>未找到匹配「{query}」的文档</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>尝试其他关键字，或检查拼写</div>
              </div>
            ) : (
              <div className="search-results-list">
                {results.map((r, idx) => (
                  <div
                    key={r.docId}
                    className={`search-item ${idx === activeIdx ? 'active' : ''}`}
                    role="option"
                    aria-selected={idx === activeIdx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => goDoc(r.docId)}
                  >
                    <div className="search-item-title">
                      <span dangerouslySetInnerHTML={{ __html: highlight(r.title, query) }} />
                      <span className="search-item-cat">{r.category}</span>
                    </div>
                    <div
                      className="search-item-snippet"
                      dangerouslySetInnerHTML={{ __html: highlight(r.snippet, query) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
