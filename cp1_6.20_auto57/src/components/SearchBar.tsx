import React, { useState, useRef, useEffect } from 'react';
import { searchCities } from '../data/destinations';
import { CityInfo } from '../types';

interface SearchBarProps {
  onSearch: (city: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CityInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ripple, setRipple] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim()) {
      const results = searchCities(query);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setRipple(true);
      setTimeout(() => setRipple(false), 300);
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (city: CityInfo) => {
    setQuery(city.name);
    setShowSuggestions(false);
    onSearch(city.name);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="search-bar-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="输入城市名称..."
            className="search-input"
            autoComplete="off"
          />
          {isLoading && (
            <span className="loading-cloud">☁️</span>
          )}
        </div>
        <button
          type="submit"
          className={`search-button ${ripple ? 'ripple' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? '查询中...' : '搜索'}
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((city, index) => (
            <div
              key={city.name}
              className="autocomplete-item"
              onClick={() => handleSuggestionClick(city)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="city-name">{city.name}</span>
              <span className="city-country">{city.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
