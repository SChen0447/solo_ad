import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import type { ResourceType } from '../types';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  onFilter: (type: ResourceType | 'all') => void;
  activeFilter: ResourceType | 'all';
  onPublish: () => void;
}

const SearchBar = ({ onSearch, onFilter, activeFilter, onPublish }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  const filters: Array<{ key: ResourceType | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: '笔记', label: '笔记' },
    { key: '习题', label: '习题' },
    { key: '课件', label: '课件' },
    { key: '其他', label: '其他' }
  ];

  return (
    <div className="search-bar">
      <div className="search-section">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索资源标题或描述..."
            className="search-input"
          />
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-buttons">
          {filters.map(filter => (
            <button
              key={filter.key}
              className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
              onClick={() => onFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="action-section">
        <button className="publish-btn" onClick={onPublish}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          发布资源
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
