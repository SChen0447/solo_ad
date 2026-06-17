import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SearchBoxProps {
  onSearch: (keyword: string) => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchHistory = useStore(state => state.searchHistory);
  const addToSearchHistory = useStore(state => state.addToSearchHistory);
  const clearSearchHistory = useStore(state => state.clearSearchHistory);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
    onSearch(value);
  }, [onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keyword.trim()) {
      addToSearchHistory(keyword);
    }
  };

  const handleHistoryClick = (historyKeyword: string) => {
    setKeyword(historyKeyword);
    onSearch(historyKeyword);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className="search-container" ref={containerRef}>
      <Search className="search-icon" size={18} />
      <input
        ref={inputRef}
        type="text"
        className="search-box"
        placeholder="搜索灵感..."
        value={keyword}
        onChange={e => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
      />
      {isFocused && searchHistory.length > 0 && (
        <div className="search-history">
          {searchHistory.map((item, index) => (
            <React.Fragment key={item.timestamp}>
              {index > 0 && <div className="search-history-divider" />}
              <div
                className="search-history-item"
                onClick={() => handleHistoryClick(item.keyword)}
              >
                <Clock size={14} />
                {item.keyword}
              </div>
            </React.Fragment>
          ))}
          <div className="search-clear" onClick={clearSearchHistory}>
            清除搜索历史
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
