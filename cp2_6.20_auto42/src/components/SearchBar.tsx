import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, Document, formatDate } from '../data/store';

function getMatchSnippet(content: string, query: string): string {
  const plain = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();

  const idx = plain.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) {
    return plain.length > 80 ? plain.substring(0, 80) + '...' : plain;
  }

  const start = Math.max(0, idx - 30);
  const end = Math.min(plain.length, idx + query.length + 50);
  let snippet = plain.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < plain.length) snippet += '...';
  return snippet;
}

function highlightKeyword(text: string, keyword: string): JSX.Element {
  if (!keyword.trim()) return <>{text}</>;

  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            style={{
              background: '#FEF3C7',
              color: '#92400E',
              borderRadius: '2px',
              padding: '0 2px',
              fontWeight: 500,
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface SearchResultItem {
  doc: Document;
  snippet: string;
}

export default function SearchBar() {
  const { state, performSearch } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [focused, setFocused] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const startTime = performance.now();

    setTimeout(() => {
      const docs = performSearch(q);
      const items = docs.map((doc) => ({
        doc,
        snippet:
          doc.title.toLowerCase().includes(q.toLowerCase())
            ? getMatchSnippet(doc.content, q)
            : getMatchSnippet(doc.content, q),
      }));
      setResults(items);
      setSearching(false);
    }, Math.max(0, 50 - (performance.now() - startTime)));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      debounceRef.current = setTimeout(() => doSearch(query), 200);
    } else {
      setResults([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, state.documents]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        setTimeout(() => setShowPanel(false), 150);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocused(false);
        setQuery('');
        setTimeout(() => setShowPanel(false), 150);
        inputRef.current?.blur();
      }
      if (e.key === '/' && !focused && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [focused]);

  useEffect(() => {
    if (focused && query.trim()) {
      const t = setTimeout(() => setShowPanel(true), 50);
      return () => clearTimeout(t);
    }
  }, [focused, results.length, query]);

  const handleResultClick = (docId: string) => {
    setFocused(false);
    setTimeout(() => setShowPanel(false), 150);
    navigate(`/doc/${docId}`);
  };

  const panelStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 'calc(100% + 10px)',
      left: 0,
      right: 0,
      background: '#FFFFFF',
      borderRadius: '14px',
      boxShadow: '0 18px 48px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.08)',
      border: '1px solid #F1F5F9',
      maxHeight: '60vh',
      overflow: 'hidden',
      transform: showPanel && focused ? 'translateY(0)' : 'translateY(-8px)',
      opacity: showPanel && focused ? 1 : 0,
      pointerEvents: showPanel && focused ? ('auto' as const) : ('none' as const),
      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
      zIndex: 60,
    }),
    [showPanel, focused]
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '60%',
        maxWidth: '720px',
        minWidth: '240px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.8)',
          border: focused ? '2px solid #2563EB' : '2px solid #E2E8F0',
          borderRadius: '20px',
          padding: '0 16px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? '0 0 0 4px rgba(37, 99, 235, 0.10)' : 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            fontSize: '16px',
            marginRight: '10px',
            color: searching ? '#2563EB' : '#94A3B8',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {searching ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="9" stroke="#2563EB" strokeWidth="2.5" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            '🔍'
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (query.trim()) setShowPanel(true);
          }}
          placeholder="搜索文档、内容或分类... (按 / 快速聚焦)"
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: '#0F172A',
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#94A3B8',
              padding: '4px 6px',
              borderRadius: '4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.background = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✕
          </button>
        )}
        {!query && (
          <span
            style={{
              fontSize: '11px',
              color: '#94A3B8',
              padding: '3px 8px',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              background: '#F8FAFC',
              whiteSpace: 'nowrap',
            }}
          >
            ESC
          </span>
        )}
      </div>

      <div style={panelStyle}>
        {results.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#94A3B8',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔎</div>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {query.trim() ? `没有找到与 "${query}" 相关的文档` : '输入关键词开始搜索'}
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '12px 16px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid #F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>搜索结果</span>
              <span style={{ color: '#94A3B8' }}>{results.length} 条</span>
            </div>
            <div style={{ maxHeight: 'calc(60vh - 40px)', overflowY: 'auto' }}>
              {results.map(({ doc, snippet }, idx) => (
                <div
                  key={doc.id}
                  onClick={() => handleResultClick(doc.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: idx < results.length - 1 ? '1px solid #F8FAFC' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '6px',
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0F172A',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {highlightKeyword(doc.title, query)}
                    </h4>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: doc.categoryColor,
                        background: `${doc.categoryColor}15`,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {doc.category}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#64748B',
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {highlightKeyword(snippet, query)}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '8px',
                      fontSize: '11px',
                      color: '#94A3B8',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{doc.author.avatar}</span>
                      {doc.author.name}
                    </span>
                    <span>·</span>
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .search-wrap {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
