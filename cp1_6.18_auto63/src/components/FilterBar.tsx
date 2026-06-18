import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ALL_CATEGORIES, CATEGORY_COLORS, Category } from '../types';
import { useGalleryStore } from '../store';

const barStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  padding: '14px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  background: 'rgba(26, 26, 46, 0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  boxSizing: 'border-box',
};

const searchWrapperStyles: React.CSSProperties = {
  position: 'relative',
  flex: '0 1 320px',
  minWidth: '180px',
};

const searchIconStyles: React.CSSProperties = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#888',
  fontSize: '14px',
  pointerEvents: 'none',
};

const searchInputStyles: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px 10px 40px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.06)',
  color: '#e0e0e0',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const dropdownWrapperStyles: React.CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
};

const dropdownButtonStyles = (isOpen: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 18px',
  borderRadius: '20px',
  border: `1px solid ${isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
  backgroundColor: 'rgba(255,255,255,0.06)',
  color: '#e0e0e0',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out',
  outline: 'none',
  fontFamily: 'inherit',
  boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
});

const dropdownMenuStyles: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  minWidth: '160px',
  borderRadius: '12px',
  backgroundColor: '#16213e',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  padding: '4px 0',
  zIndex: 200,
};

const dropdownItemStyles = (active: boolean, color: string): React.CSSProperties => ({
  padding: '10px 16px',
  color: '#e0e0e0',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease-out, transform 0.2s ease-out',
  backgroundColor: active ? `${color}22` : 'transparent',
  borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
  fontWeight: active ? 600 : 400,
});

const chevronStyles = (isOpen: boolean): React.CSSProperties => ({
  transition: 'transform 0.2s ease-out',
  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  fontSize: '12px',
});

const categoryDotStyles = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: '8px',
});

const titleStyles: React.CSSProperties = {
  color: '#e0e0e0',
  fontSize: '18px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  margin: 0,
  letterSpacing: '0.5px',
};

export const FilterBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCategory = useGalleryStore((s) => s.selectedCategory);
  const searchKeyword = useGalleryStore((s) => s.searchKeyword);
  const setCategory = useGalleryStore((s) => s.setCategory);
  const setSearchKeyword = useGalleryStore((s) => s.setSearchKeyword);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleCategorySelect = (cat: Category | '全部') => {
    setCategory(cat);
    setIsOpen(false);
  };

  return (
    <div style={barStyles}>
      <h1 style={titleStyles}>📷 画廊</h1>

      <div style={searchWrapperStyles}>
        <span style={searchIconStyles}>🔍</span>
        <input
          type="text"
          placeholder="搜索照片..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            ...searchInputStyles,
            borderColor: searchFocused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            boxShadow: searchFocused ? '0 0 12px rgba(255,255,255,0.06)' : 'none',
          }}
        />
      </div>

      <div style={dropdownWrapperStyles} ref={dropdownRef}>
        <button
          style={dropdownButtonStyles(isOpen)}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedCategory !== '全部' && (
            <span style={categoryDotStyles(CATEGORY_COLORS[selectedCategory as Category])} />
          )}
          {selectedCategory}
          <span style={chevronStyles(isOpen)}>▼</span>
        </button>

        {isOpen && (
          <div style={dropdownMenuStyles}>
            <div
              style={dropdownItemStyles(selectedCategory === '全部', '#e0e0e0')}
              onClick={() => handleCategorySelect('全部')}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  selectedCategory === '全部' ? 'rgba(224,224,224,0.13)' : 'transparent';
              }}
            >
              全部
            </div>
            {ALL_CATEGORIES.map((cat) => (
              <div
                key={cat}
                style={dropdownItemStyles(selectedCategory === cat, CATEGORY_COLORS[cat])}
                onClick={() => handleCategorySelect(cat)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = `${CATEGORY_COLORS[cat]}15`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    selectedCategory === cat ? `${CATEGORY_COLORS[cat]}22` : 'transparent';
                }}
              >
                <span style={categoryDotStyles(CATEGORY_COLORS[cat])} />
                {cat}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
