import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { SearchResult } from '../types';

const DEBOUNCE_MS = 150;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}

interface Props {
  pageTitle: string;
}

const SearchBar: React.FC<Props> = ({ pageTitle }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { search } = useAppContext();
  const wrapRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    const myReqId = ++reqIdRef.current;
    search(q)
      .then(res => {
        if (myReqId !== reqIdRef.current) return;
        setResults(res);
        setOpen(true);
      })
      .catch(err => {
        if (myReqId !== reqIdRef.current) return;
        console.error(err);
      });
  }, [debouncedQuery, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleResultClick = (item: SearchResult) => {
    const artistId = item.type === 'artist'
      ? (item.data as { id: string }).id
      : (item.data as { artistId: string }).artistId;
    setOpen(false);
    setQuery('');
    navigate(`/artists/${artistId}`);
  };

  return (
    <>
      <div className="page-title">{pageTitle}</div>
      <div className="search-box" ref={wrapRef}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索艺术家或作品..."
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim() && setOpen(true)}
        />
        {open && results.length > 0 && (
          <div className="search-dropdown">
            {results.map((item, idx) => (
              <div
                key={`${item.type}-${idx}`}
                className="search-item"
                onClick={() => handleResultClick(item)}
              >
                <span className={`search-item-type ${item.type}`}>
                  {item.type === 'artist' ? '艺术家' : '作品'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {(item.data as { name: string }).name}
                  </div>
                  {item.type === 'track' && item.artist && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {item.artist.name}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SearchBar;
