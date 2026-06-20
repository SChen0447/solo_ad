import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, CATEGORY_COLORS } from '../data/store'

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const re = new RegExp('(' + escapeRegExp(query.trim()) + ')', 'gi')
  const parts = text.split(re)
  return parts.map(function (p, i) {
    return re.test(p) ? (
      <mark key={i} style={{
        background: '#FED7AA',
        color: '#9A3412',
        padding: '0 3px',
        borderRadius: 3,
        fontWeight: 500
      }}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  })
}

export default function SearchBar() {
  const { state, performSearch } = useStore()
  const navigate = useNavigate()
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const closePanel = useCallback(function () {
    if (!open) return
    setClosing(true)
    setTimeout(function () {
      setOpen(false)
      setClosing(false)
    }, 250)
  }, [open])

  const debouncedSearch = useCallback(function (searchText: string) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(function () {
      performSearch(searchText)
    }, 200)
  }, [performSearch])

  useEffect(function () {
    debouncedSearch(query)
    return function () {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, debouncedSearch])

  useEffect(function () {
    setActiveIdx(0)
  }, [state.searchResults.length])

  useEffect(function () {
    function handleDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePanel()
        if (inputRef.current) inputRef.current.blur()
      }
      if (open && state.searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIdx(function (i) { return (i + 1) % state.searchResults.length })
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIdx(function (i) { return (i - 1 + state.searchResults.length) % state.searchResults.length })
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          const r = state.searchResults[activeIdx]
          if (r) {
            navigate('/doc/' + r.document.id)
            closePanel()
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        setClosing(false)
        if (inputRef.current) inputRef.current.focus()
      }
    }
    document.addEventListener('click', handleDocClick)
    document.addEventListener('keydown', handleKey)
    return function () {
      document.removeEventListener('click', handleDocClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, closePanel, state.searchResults, activeIdx, navigate])

  const showPanel = open || focused
  const hasQuery = query.trim().length > 0
  const results = state.searchResults

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 720,
        zIndex: 50
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 18,
            zIndex: 2,
            color: focused ? '#2563EB' : '#94A3B8',
            fontSize: 15,
            transition: 'color 0.2s',
            pointerEvents: 'none'
          }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={function (e) {
            const v = e.target.value
            setQuery(v)
            if (v.trim()) {
              setOpen(true)
              setClosing(false)
            }
          }}
          onFocus={function () {
            setFocused(true)
            if (query.trim()) {
              setOpen(true)
              setClosing(false)
            }
          }}
          onBlur={function () { setFocused(false) }}
          placeholder="搜索文档标题、内容、分类... (Ctrl+K)"
          style={{
            width: '100%',
            padding: '11px 44px 11px 44px',
            borderRadius: 20,
            border: '1.5px solid ' + (focused ? '#2563EB' : 'rgba(226, 232, 240, 0.9)'),
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            fontSize: 13.5,
            color: '#0F172A',
            outline: 'none',
            transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: focused ? '0 0 0 4px rgba(37, 99, 235, 0.1), 0 4px 12px rgba(15, 23, 42, 0.06)' : '0 1px 3px rgba(15,23,42,0.04)',
            fontFamily: 'inherit'
          }}
        />
        {query && (
          <button
            onClick={function () {
              setQuery('')
              performSearch('')
              if (inputRef.current) inputRef.current.focus()
            }}
            style={{
              position: 'absolute',
              right: 14,
              width: 22, height: 22,
              borderRadius: '50%',
              border: 'none',
              background: '#E2E8F0',
              color: '#64748B',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              zIndex: 2
            }}
            onMouseEnter={function (e) { e.currentTarget.style.background = '#CBD5E1'; e.currentTarget.style.color = '#0F172A' }}
            onMouseLeave={function (e) { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}
          >
            ×
          </button>
        )}
      </div>

      {(showPanel && (hasQuery || !closing)) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            animation: closing ? 'slideDown 0.25s cubic-bezier(0.4, 0, 1, 1) forwards' : 'fadeIn 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
            transformOrigin: 'top center',
            opacity: closing ? 0 : 1,
            pointerEvents: closing ? 'none' : 'auto'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 14,
              boxShadow: '0 10px 40px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
              border: '1px solid #F1F5F9',
              overflow: 'hidden',
              maxHeight: 480,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #F1F5F9',
                background: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                搜索结果
              </div>
              <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                {state.isSearching ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 12, height: 12,
                      border: '2px solid rgba(37,99,235,0.2)',
                      borderTopColor: '#2563EB',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite'
                    }} />
                    搜索中...
                  </span>
                ) : (
                  '匹配 ' + results.length + ' / ' + state.documents.length + ' 篇'
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {results.length === 0 && hasQuery && !state.isSearching ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.5 }}>🔎</div>
                  <div style={{ fontSize: 14, color: '#475569', fontWeight: 500, marginBottom: 4 }}>
                    未找到匹配的文档
                  </div>
                  <div style={{ fontSize: 12.5, color: '#94A3B8' }}>
                    尝试使用不同的关键词，或减少搜索条件
                  </div>
                </div>
              ) : (
                results.map(function (r, i) {
                  const color = CATEGORY_COLORS[r.document.colorIndex % CATEGORY_COLORS.length]
                  const isActive = i === activeIdx
                  return (
                    <div
                      key={r.document.id}
                      onClick={function () {
                        navigate('/doc/' + r.document.id)
                        closePanel()
                        setQuery('')
                        performSearch('')
                      }}
                      onMouseEnter={function () { setActiveIdx(i) }}
                      style={{
                        padding: '14px 16px',
                        cursor: 'pointer',
                        background: isActive ? '#EFF6FF' : 'transparent',
                        borderLeft: '3px solid ' + (isActive ? '#2563EB' : 'transparent'),
                        transition: 'all 0.12s'
                      }}
                      onMouseEnterCapture={function (e) { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: color + '18',
                            color: color,
                            fontSize: 10.5,
                            fontWeight: 600,
                            border: '1px solid ' + color + '25'
                          }}
                        >
                          {r.document.category}
                        </span>
                        <h4 style={{
                          margin: 0,
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: '#0F172A',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {highlight(r.document.title, query)}
                        </h4>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: 12.5,
                        color: '#64748B',
                        lineHeight: 1.55,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {highlight(r.snippet, query)}
                      </p>
                    </div>
                  )
                })
              )}
            </div>

            {(results.length > 0 || hasQuery) && (
              <div
                style={{
                  padding: '9px 16px',
                  borderTop: '1px solid #F1F5F9',
                  background: '#FAFBFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {[
                    { key: '↑↓', label: '导航' },
                    { key: '↵', label: '打开' },
                    { key: 'Esc', label: '关闭' }
                  ].map(function (h, i) {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <kbd style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'white',
                          border: '1px solid #E2E8F0',
                          borderBottomWidth: 2,
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: '#64748B',
                          fontFamily: "'SF Mono', monospace"
                        }}>
                          {h.key}
                        </kbd>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>{h.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  最多显示 15 条结果
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
        @media (max-width: 767px) {
          input::placeholder { font-size: 12px; }
        }
      `}</style>
    </div>
  )
}
