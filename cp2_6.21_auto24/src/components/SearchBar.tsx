import React, { useCallback, useEffect, useRef, useState } from 'react';

interface BookResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;
}

interface SearchBarProps {
  onBookClick: (id: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onBookClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookResult[]>([]);
  const [focused, setFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        setShowDropdown(true);
      })
      .catch(() => setResults([]));
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSearch(query);
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  const handleClickOutside = useCallback(() => {
    setShowDropdown(false);
  }, []);

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setFocused(true);
          if (results.length > 0) setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(handleClickOutside, 200);
          setFocused(false);
        }}
        placeholder="搜索书名、作者或分类..."
        style={{
          width: '100%',
          padding: '10px 20px',
          borderRadius: 24,
          border: focused ? '2px solid #C4B5FD' : '2px solid transparent',
          background: focused ? '#fff' : '#F3F4F6',
          fontSize: 14,
          color: '#374151',
          outline: 'none',
          transition: 'all 0.2s',
          boxShadow: focused ? '0 2px 8px rgba(139,92,246,0.15)' : 'none',
        }}
      />
      {showDropdown && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {results.map((book) => (
            <div
              key={book.id}
              onMouseDown={() => {
                onBookClick(book.id);
                setShowDropdown(false);
                setQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                cursor: 'pointer',
                transition: 'background 0.15s',
                borderBottom: '1px solid #F3F4F6',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#F3E8FF';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <img
                src={book.coverUrl}
                alt={book.title}
                style={{ width: 32, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {highlightMatch(book.title, query)}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {highlightMatch(book.author, query)}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: '#F3E8FF',
                  color: '#8B5CF6',
                  flexShrink: 0,
                }}
              >
                {book.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
