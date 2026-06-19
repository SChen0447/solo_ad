import React, { useState, useRef, useEffect, useMemo } from 'react';
import { mockEvents } from '../dataManager/mockData';
import { HistoricalEvent } from '../dataManager/types';
import '../styles/SearchBar.css';

interface SearchBarProps {
  searchFilter: string;
  onSearchChange: (value: string) => void;
  onSelectEvent: (eventId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchFilter,
  onSearchChange,
  onSelectEvent,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!searchFilter.trim()) return [];

    const searchLower = searchFilter.toLowerCase();
    return mockEvents
      .filter((event) =>
        event.title.toLowerCase().includes(searchLower) ||
        event.date.toLowerCase().includes(searchLower) ||
        event.category.toLowerCase().includes(searchLower)
      )
      .slice(0, 8);
  }, [searchFilter]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputFocus = () => {
    if (searchFilter.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (event: HistoricalEvent) => {
    onSelectEvent(event.id);
    onSearchChange(event.title);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && searchFilter.trim()) {
        setShowSuggestions(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const handleClear = () => {
    onSearchChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-container">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
        >
          <path
            fill="#8b4513"
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索历史事件、年份、分类..."
          value={searchFilter}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
        />

        {searchFilter && (
          <button
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="清除搜索"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#8b4513"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="search-suggestions"
          role="listbox"
        >
          {suggestions.map((event, index) => (
            <div
              key={event.id}
              className={`search-suggestion-item ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleSuggestionClick(event)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="suggestion-date">{event.date}</div>
              <div className="suggestion-title">
                {highlightText(event.title, searchFilter)}
              </div>
              <div className="suggestion-category">{event.category}</div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && searchFilter.trim() && suggestions.length === 0 && (
        <div className="search-suggestions no-results">
          <div className="no-results-text">未找到匹配的历史事件</div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
