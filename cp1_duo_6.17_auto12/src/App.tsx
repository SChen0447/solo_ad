import React, { useState, useEffect, useCallback } from 'react';
import { Timeline } from './components/Timeline';
import { DiaryEditor } from './components/DiaryEditor';
import { DiaryEntry, CreateDiaryRequest } from './types';
import { diaryApi } from './api/diaryApi';

const App: React.FC = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isMobile, setIsMobile] = useState(false);
  const [activeNav, setActiveNav] = useState('timeline');
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const availableYears = Array.from(
    new Set(entries.map(e => new Date(e.date).getFullYear()))
  ).sort((a, b) => b - a);
  
  if (availableYears.length === 0 || !availableYears.includes(selectedYear)) {
    availableYears.unshift(selectedYear);
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!showYearDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.year-selector-wrapper') && !target.closest('.year-dropdown')) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showYearDropdown]);

  const loadDiaries = useCallback(async (year?: number, month?: number) => {
    setLoading(true);
    try {
      const data = await diaryApi.getDiaries(year, month);
      setEntries(prev => {
        const newEntries = [...prev];
        data.forEach(entry => {
          if (!newEntries.find(e => e.id === entry.id)) {
            newEntries.push(entry);
          }
        });
        return newEntries.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });
    } catch (error) {
      console.error('Failed to load diaries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    loadDiaries(currentYear, currentMonth);
  }, [loadDiaries]);

  const handleLoadMore = useCallback((year: number, month: number) => {
    loadDiaries(year, month);
  }, [loadDiaries]);

  const handleSaveDiary = async (data: CreateDiaryRequest) => {
    try {
      const newEntry = await diaryApi.createDiary(data);
      setEntries(prev => [newEntry, ...prev].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save diary:', error);
      alert('保存失败，请重试');
    }
  };

  const handleSearch = async (keyword: string) => {
    setSearchKeyword(keyword);
    if (!keyword.trim()) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      loadDiaries(currentYear, currentMonth);
      return;
    }
    
    setLoading(true);
    try {
      const results = await diaryApi.searchDiaries({ keyword });
      setEntries(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const entryYear = new Date(entry.date).getFullYear();
    return entryYear === selectedYear;
  });

  const NavItem: React.FC<{
    icon: string;
    label: string;
    id: string;
    onClick?: () => void;
  }> = ({ icon, label, id, onClick }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '8px 16px' : '12px 8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        borderRadius: '8px',
        backgroundColor: activeNav === id ? 'rgba(100, 181, 246, 0.2)' : 'transparent',
        color: activeNav === id ? '#64B5F6' : '#888'
      }}
      onMouseEnter={(e) => {
        if (activeNav !== id) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeNav !== id) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      {isMobile && (
        <span style={{ fontSize: '10px', marginTop: '4px' }}>{label}</span>
      )}
    </div>
  );

  return (
    <div 
      className="app-container"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#E0E0E0'
      }}
    >
      {!isMobile && (
        <nav 
          className="sidebar"
          style={{
            width: '60px',
            backgroundColor: '#1A1A1A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 0',
            gap: '16px',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            borderRight: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div 
            className="avatar"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #64B5F6, #1A237E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 600,
              color: 'white',
              marginBottom: '16px'
            }}
          >
            U
          </div>
          
          <NavItem icon="📅" label="时间线" id="timeline" onClick={() => setActiveNav('timeline')} />
          <NavItem icon="🔍" label="搜索" id="search" onClick={() => setActiveNav('search')} />
          
          <div style={{ flex: 1 }} />
          
          <div 
            className="year-selector-wrapper"
            style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="year-selector-btn"
              title={`${selectedYear}年`}
            >
              {String(selectedYear).slice(-2)}
            </button>
            {showYearDropdown && (
              <div className="year-dropdown">
                {availableYears.map(year => (
                  <button
                    key={year}
                    className={`year-dropdown-item ${year === selectedYear ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedYear(year);
                      setShowYearDropdown(false);
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <NavItem icon="⚙️" label="设置" id="settings" onClick={() => setActiveNav('settings')} />
        </nav>
      )}

      <main 
        className="main-content"
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : '60px',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: isMobile ? '70px' : 0
        }}
      >
        <header 
          className="top-header"
          style={{
            padding: '16px 24px',
            backgroundColor: 'rgba(18, 18, 18, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 50
          }}
        >
          <div 
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <h1 
              style={{
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: 700,
                background: 'linear-gradient(90deg, #42A5F5, #64B5F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                whiteSpace: 'nowrap'
              }}
            >
              音乐时光胶囊
            </h1>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索日记关键词..."
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '20px',
                  color: '#E0E0E0',
                  fontSize: '14px',
                  backdropFilter: 'blur(10px)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#64B5F6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(100, 181, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <span 
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontSize: '14px'
                }}
              >
                🔍
              </span>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, animation: 'pageFadeIn 0.3s ease-out' }}>
          {activeNav === 'timeline' || activeNav === 'search' ? (
            <Timeline
              entries={filteredEntries}
              onLoadMore={handleLoadMore}
              loading={loading}
              onSearch={handleSearch}
            />
          ) : (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                color: '#666'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
                <p>设置功能开发中...</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowEditor(true)}
          style={{
            position: 'fixed',
            right: isMobile ? '20px' : '32px',
            bottom: isMobile ? '90px' : '32px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #64B5F6, #42A5F5)',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(100, 181, 246, 0.4)',
            transition: 'all 0.3s ease-out',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(100, 181, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(100, 181, 246, 0.4)';
          }}
        >
          +
        </button>
      </main>

      {isMobile && (
        <nav 
          className="bottom-nav"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: '#1A1A1A',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            zIndex: 100
          }}
        >
          <NavItem icon="📅" label="时间线" id="timeline" onClick={() => setActiveNav('timeline')} />
          <NavItem icon="🔍" label="搜索" id="search" onClick={() => setActiveNav('search')} />
          <div style={{ width: '56px' }} />
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="year-selector-btn-mobile"
              title={`${selectedYear}年`}
            >
              {String(selectedYear).slice(-2)}
            </button>
            {showYearDropdown && (
              <div className="year-dropdown year-dropdown-mobile">
                {availableYears.map(year => (
                  <button
                    key={year}
                    className={`year-dropdown-item ${year === selectedYear ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedYear(year);
                      setShowYearDropdown(false);
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          <NavItem icon="⚙️" label="设置" id="settings" onClick={() => setActiveNav('settings')} />
        </nav>
      )}

      {showEditor && (
        <DiaryEditor
          onSave={handleSaveDiary}
          onClose={() => setShowEditor(false)}
        />
      )}

      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: #333 #1A1A1A;
        }
        *::-webkit-scrollbar {
          width: 6px;
        }
        *::-webkit-scrollbar-track {
          background: #1A1A1A;
        }
        *::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: #444;
        }

        .year-selector-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #64B5F6;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .year-selector-btn:hover {
          background: rgba(100, 181, 246, 0.15);
          border-color: rgba(100, 181, 246, 0.4);
        }

        .year-selector-btn-mobile {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #64B5F6;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .year-dropdown {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: calc(100% + 8px);
          background: #2A2A2A;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 6px;
          min-width: 80px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 200;
          animation: dropdownFadeIn 0.2s ease-out;
        }

        .year-dropdown-mobile {
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
        }

        .year-dropdown-item {
          display: block;
          width: 100%;
          padding: 8px 16px;
          background: none;
          border: none;
          color: #B0BEC5;
          font-size: 13px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s;
          text-align: center;
        }
        .year-dropdown-item:hover {
          background: rgba(100, 181, 246, 0.15);
          color: #64B5F6;
        }
        .year-dropdown-item.active {
          background: rgba(100, 181, 246, 0.2);
          color: #64B5F6;
          font-weight: 600;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes pageFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default App;
