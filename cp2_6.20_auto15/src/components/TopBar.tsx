import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/topbar.css';

const TopBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { state, search } = useApp();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      search(value);
    }, 200);
  }, [search]);

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: typeof state.searchResults[0]) => {
    setShowResults(false);
    setQuery('');
    if (result.type === 'artist') {
      navigate(`/artists/${result.id}`);
    } else if (result.type === 'work' && result.artistId) {
      navigate(`/artists/${result.artistId}`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-search" ref={searchRef}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索艺术家或作品..."
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        {showResults && query.trim() && (
          <div className="search-results">
            {state.searchResults.length > 0 ? (
              state.searchResults.map((result, idx) => (
                <div
                  key={`${result.type}-${result.id}-${idx}`}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <span className="result-icon">
                    {result.type === 'artist' ? '🎤' : '🎵'}
                  </span>
                  <div className="result-info">
                    <span className="result-name">{result.name}</span>
                    {result.type === 'work' && result.artistName && (
                      <span className="result-sub">— {result.artistName}</span>
                    )}
                  </div>
                  <span className="result-type">
                    {result.type === 'artist' ? '艺术家' : '作品'}
                  </span>
                </div>
              ))
            ) : (
              <div className="search-no-results">未找到匹配结果</div>
            )}
          </div>
        )}
      </div>
      <div className="topbar-user">
        <span className="user-avatar">👤</span>
        <span className="user-name">管理员</span>
      </div>
    </header>
  );
};

export default TopBar;
