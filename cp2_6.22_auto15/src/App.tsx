import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import ExhibitCard from './components/ExhibitCard';
import ExhibitDetail from './components/ExhibitDetail';
import QRCodeModal from './components/QRCodeModal';
import { getExhibits, Exhibit } from './utils/api';

function App() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [qrExhibit, setQrExhibit] = useState<Exhibit | null>(null);
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadExhibits();
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  async function loadExhibits() {
    try {
      setLoading(true);
      const data = await getExhibits();
      setExhibits(data);
    } catch (err) {
      console.error('加载展品失败:', err);
    } finally {
      setLoading(false);
    }
  }

  const refreshExhibit = useCallback((updated: Exhibit) => {
    setExhibits((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
    );
  }, []);

  const filteredExhibits = useMemo(() => {
    if (!debouncedSearch.trim()) return exhibits;
    const query = debouncedSearch.toLowerCase();
    return exhibits.filter((e) =>
      e.name.toLowerCase().includes(query)
    );
  }, [exhibits, debouncedSearch]);

  function handleLogout() {
    alert('已退出登录');
  }

  const navStyle: React.CSSProperties = {
    height: '64px',
    backgroundColor: '#FFFFFF',
    borderBottom: '2px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
  };

  const navRightStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  };

  const usernameStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
  };

  const logoutStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#EF4444',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  };

  const searchBoxStyle: React.CSSProperties = {
    maxWidth: '1280px',
    margin: '24px auto',
    padding: '0 16px',
  };

  const searchInputStyle: React.CSSProperties = {
    width: '320px',
    padding: '10px 16px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const waterfallContainerStyle: React.CSSProperties = {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 16px 48px',
  };

  const columnsStyle: React.CSSProperties = {
    columnWidth: '280px',
    columnGap: '20px',
    width: '100%',
  };

  const cardWrapStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '100%',
    marginBottom: '20px',
    breakInside: 'avoid',
    animation: 'cardFadeIn 0.5s ease-out forwards',
    opacity: 0,
  };

  const keyframesStyle = `
    @keyframes cardFadeIn {
      from {
        opacity: 0.2;
        transform: translateY(40px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .waterfall-columns {
      column-width: 280px;
      column-gap: 20px;
    }
    .waterfall-columns > div {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      display: inline-block;
      width: 100%;
      margin-bottom: 20px;
    }
    @media (max-width: 768px) {
      .waterfall-columns {
        column-count: 2 !important;
        column-width: auto !important;
        column-gap: 12px;
      }
    }
  `;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', color: '#374151' }}>
      <style>{keyframesStyle}</style>

      <nav style={navStyle}>
        <div style={logoStyle}>微展览</div>
        <div style={navRightStyle}>
          <span style={usernameStyle}>策展人 · 小林</span>
          <button
            style={logoutStyle}
            onClick={handleLogout}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            退出登录
          </button>
        </div>
      </nav>

      <div style={searchBoxStyle}>
        <input
          type="text"
          placeholder="搜索展品名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#6366F1')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
        />
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <div style={waterfallContainerStyle}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>
                  加载中...
                </div>
              ) : filteredExhibits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>
                  暂无展品
                </div>
              ) : (
                <div style={{ ...columnsStyle }} className="waterfall-columns">
                  {filteredExhibits.map((exhibit, idx) => (
                    <div
                      key={exhibit.id}
                      style={{
                        ...cardWrapStyle,
                        animationDelay: `${Math.min(idx * 0.05, 0.5)}s`,
                      }}
                    >
                      <ExhibitCard
                        exhibit={exhibit}
                        onRefresh={refreshExhibit}
                        onOpenDetail={() => setSelectedExhibit(exhibit)}
                        onOpenQR={() => setQrExhibit(exhibit)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
        />
      </Routes>

      {selectedExhibit && (
        <ExhibitDetail
          exhibit={selectedExhibit}
          onClose={() => setSelectedExhibit(null)}
        />
      )}

      {qrExhibit && (
        <QRCodeModal
          exhibit={qrExhibit}
          onClose={() => setQrExhibit(null)}
        />
      )}
    </div>
  );
}

export default App;
