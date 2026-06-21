import { useState, useEffect } from 'react';
import ArtistGrid from './components/ArtistGrid';
import ArtistDetail from './components/ArtistDetail';
import { Artist, StyleCategory } from './types';

const CATEGORIES: StyleCategory[] = ['all', '陶瓷', '木工', '织物', '金属'];

function App() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<StyleCategory>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists();
  }, [activeCategory, searchKeyword]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeCategory !== 'all') {
        params.append('style', activeCategory);
      }
      if (searchKeyword.trim()) {
        params.append('keyword', searchKeyword.trim());
      }
      const res = await fetch(`/api/artists?${params.toString()}`);
      const data = await res.json();
      setArtists(data);
    } catch (error) {
      console.error('获取手作人列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: StyleCategory) => {
    setActiveCategory(category);
    setMobileMenuOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  const handleArtistClick = (id: number) => {
    setSelectedArtistId(id);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSelectedArtistId(null);
    window.scrollTo(0, 0);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const renderSidebarContent = () => (
    <>
      <div className="logo">匠人集</div>
      <h3>风格分类</h3>
      <div className="category-buttons">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat)}
          >
            {cat === 'all' ? '全部作品' : cat}
          </button>
        ))}
      </div>
      <h3>关键词搜索</h3>
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索手作人或材料..."
          value={searchKeyword}
          onChange={handleSearchChange}
        />
      </div>
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        {renderSidebarContent()}
      </aside>

      <div className="mobile-header">
        <button className="hamburger-btn" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <div className="mobile-logo">匠人集</div>
        <div style={{ width: 40 }} />
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          {renderSidebarContent()}
        </div>
      )}

      <main className="main-content">
        {selectedArtistId ? (
          <ArtistDetail
            artistId={selectedArtistId}
            onBack={handleBack}
            onSuccess={() => showToast('预约成功！')}
          />
        ) : (
          <ArtistGrid
            artists={artists}
            loading={loading}
            onArtistClick={handleArtistClick}
          />
        )}

        <footer className="footer">
          © 2024 匠人集 - 发现身边的手作之美
        </footer>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
