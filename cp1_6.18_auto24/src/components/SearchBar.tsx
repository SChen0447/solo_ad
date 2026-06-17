import React from 'react'
import { BookType } from '../types'
import './SearchBar.css'

interface SearchBarProps {
  searchKeyword: string
  onSearchChange: (keyword: string) => void
  filterType: BookType | 'all'
  onFilterTypeChange: (type: BookType | 'all') => void
  filterRating: [number, number]
  onFilterRatingChange: (rating: [number, number]) => void
}

export function SearchBar({
  searchKeyword,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterRating,
  onFilterRatingChange,
}: SearchBarProps) {
  const typeOptions: { value: BookType | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'book', label: '书' },
    { value: 'article', label: '文章' },
    { value: 'paper', label: '论文' },
  ]

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="搜索书名、作者或笔记..."
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchKeyword && (
          <button
            className="search-clear"
            onClick={() => onSearchChange('')}
          >
            ×
          </button>
        )}
      </div>
      <div className="filter-group">
        <span className="filter-label">类型:</span>
        <div className="filter-options">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              className={`filter-option ${filterType === option.value ? 'active' : ''}`}
              onClick={() => onFilterTypeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <span className="filter-label">评分:</span>
        <div className="rating-filter">
          <select
            value={filterRating[0]}
            onChange={(e) => onFilterRatingChange([Number(e.target.value), filterRating[1]])}
            className="rating-select"
          >
            <option value={0}>0星</option>
            <option value={1}>1星</option>
            <option value={2}>2星</option>
            <option value={3}>3星</option>
            <option value={4}>4星</option>
            <option value={5}>5星</option>
          </select>
          <span className="rating-separator">-</span>
          <select
            value={filterRating[1]}
            onChange={(e) => onFilterRatingChange([filterRating[0], Number(e.target.value)])}
            className="rating-select"
          >
            <option value={0}>0星</option>
            <option value={1}>1星</option>
            <option value={2}>2星</option>
            <option value={3}>3星</option>
            <option value={4}>4星</option>
            <option value={5}>5星</option>
          </select>
        </div>
      </div>
    </div>
  )
}
