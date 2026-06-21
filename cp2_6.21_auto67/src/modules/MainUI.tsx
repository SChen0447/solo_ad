import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Dynasty } from '../types';
import { debounce, generateId } from '../utils';

interface MainUIProps {
  onSearch: (query: string) => void;
  onDynastyChange: (dynasty: string) => void;
  onFilterTrigger: (trigger: number) => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
}

const MainUI: React.FC<MainUIProps> = ({
  onSearch,
  onDynastyChange,
  onFilterTrigger,
  isMusicPlaying,
  onToggleMusic
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedDynasty, setSelectedDynasty] = useState<Dynasty>('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
      onFilterTrigger(Date.now());
    }, 400),
    [onSearch, onFilterTrigger]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleSearchSubmit = useCallback(() => {
    onSearch(searchValue);
    onFilterTrigger(Date.now());
  }, [searchValue, onSearch, onFilterTrigger]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }, [handleSearchSubmit]);

  const handleDynastyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Dynasty;
    setSelectedDynasty(value);
    onDynastyChange(value);
    onFilterTrigger(Date.now());
  }, [onDynastyChange, onFilterTrigger]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setSelectedDynasty('');
    onSearch('');
    onDynastyChange('');
    onFilterTrigger(Date.now());
  }, [onSearch, onDynastyChange, onFilterTrigger]);

  const dynastyOptions: { value: Dynasty; label: string }[] = [
    { value: '', label: '全部朝代' },
    { value: '唐', label: '唐代' },
    { value: '宋', label: '宋代' },
    { value: '元', label: '元代' },
    { value: '明', label: '明代' },
    { value: '清', label: '清代' }
  ];

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '20px 30px',
          background: 'linear-gradient(180deg, rgba(44, 62, 80, 0.98) 0%, rgba(52, 73, 94, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(250, 240, 230, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 8
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#FAF0E6',
                fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
                letterSpacing: 8,
                textShadow: '2px 2px 8px rgba(0,0,0,0.4)',
                textAlign: 'center'
              }}
            >
              烟雨诗韵
            </div>
            <div
              style={{
                width: 40,
                height: 1,
                background: 'linear-gradient(90deg, transparent, #8B4513, transparent)'
              }}
            />
            <div
              style={{
              fontSize: 13,
              color: 'rgba(250, 240, 230, 0.6)',
              fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
              letterSpacing: 2
            }}
            >
              · 诗词瀑布 ·
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                flex: '1',
                maxWidth: 420,
                minWidth: 240
              }}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="搜索诗词、作者..."
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 18px',
                  fontSize: 15,
                  fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
                  backgroundColor: 'rgba(250, 240, 230, 0.08)',
                  border: `1px solid ${isSearchFocused ? 'rgba(139, 69, 19, 0.5)' : 'rgba(250, 240, 230, 0.15)'}`,
                  borderRadius: 6,
                  color: '#FAF0E6',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  letterSpacing: 1
                }}
              />
              {searchValue && (
                <button
                  onClick={handleClearSearch}
                  style={{
                    position: 'absolute',
                    right: 54,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 20,
                    height: 20,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'rgba(250, 240, 230, 0.5)',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    fontFamily: 'sans-serif'
                  }}
                >
                  ×
                </button>
              )}
              <button
                onClick={handleSearchSubmit}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 34,
                  height: 34,
                  border: 'none',
                  backgroundColor: '#8B4513',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>

            <select
              value={selectedDynasty}
              onChange={handleDynastyChange}
              style={{
                padding: '12px 40px 12px 16px',
                fontSize: 15,
                fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
                backgroundColor: 'rgba(250, 240, 230, 0.08)',
                border: '1px solid rgba(250, 240, 230, 0.15)',
                borderRadius: 6,
                color: '#FAF0E6',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                transition: 'all 0.3s ease',
                letterSpacing: 1,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23FAF0E6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                backgroundSize: '12px'
              }}
            >
              {dynastyOptions.map(opt => (
                <option key={opt.value || 'all'} value={opt.value} style={{ backgroundColor: '#2C3E50', color: '#FAF0E6' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <button
        onClick={onToggleMusic}
        style={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: '#8B4513',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          boxShadow: isMusicPlaying
            ? '0 4px 20px rgba(139, 69, 19, 0.5), 0 0 0 0 rgba(139, 69, 19, 0.4)'
            : '0 4px 15px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
          animation: isMusicPlaying ? 'pulseGlow 2s ease-in-out infinite' : 'none'
        }}
        title={isMusicPlaying ? '暂停音乐' : '播放音乐'}
      >
        {isMusicPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21 5,3"></polygon>
          </svg>
        )}
      </button>

      <style>{`
        input::placeholder {
          color: rgba(250, 240, 230, 0.4);
        }
        select:focus {
          border-color: rgba(139, 69, 19, 0.5);
        }
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(139, 69, 19, 0.5), 0 0 0 0 rgba(139, 69, 19, 0.4);
          }
          50% {
            box-shadow: 0 4px 25px rgba(139, 69, 19, 0.6), 0 0 0 12px rgba(139, 69, 19, 0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInSlow {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          header {
            padding: 16px 20px !important;
          }
          header > div > div:first-child > div:first-child {
            font-size: 24px !important;
            letter-spacing: 4px !important;
          }
          header > div > div:first-child > div:last-child {
            font-size: 11px !important;
          }
          input, select {
            font-size: 14px !important;
            padding: 10px 36px 10px 14px !important;
          }
          button[style*="fixed"] {
            bottom: 20px !important;
            right: 20px !important;
          }
        }
      `}</style>
    </>
  );
};

export default MainUI;
