import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import ExplorePage from './pages/ExplorePage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import './App.css';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setSearchInput('');
    setShowMobileMenu(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/', { state: { search: searchInput } });
    }
  };

  const isHome = location.pathname === '/';
  const isFavorites = location.pathname === '/favorites';
  const isProfile = location.pathname === '/profile';

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={() => setShowMobileMenu(false)}>
          <span className="brand-logo">🥐</span>
          <span className="brand-name">烘焙厨房</span>
        </Link>

        <form className="nav-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="搜索食谱、标签..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" aria-label="搜索">🔍</button>
        </form>

        <div className={`nav-links ${showMobileMenu ? 'show' : ''}`}>
          <Link
            to="/"
            className={`nav-link ${isHome ? 'active' : ''}`}
            onClick={() => setShowMobileMenu(false)}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">发现</span>
          </Link>
          <Link
            to="/favorites"
            className={`nav-link ${isFavorites ? 'active' : ''}`}
            onClick={() => setShowMobileMenu(false)}
          >
            <span className="nav-icon">❤️</span>
            <span className="nav-text">我的收藏</span>
          </Link>
          <Link
            to="/profile"
            className={`nav-link ${isProfile ? 'active' : ''}`}
            onClick={() => setShowMobileMenu(false)}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-text">个人中心</span>
          </Link>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setShowMobileMenu(s => !s)}
          aria-label="菜单"
        >
          <span className={`hamburger ${showMobileMenu ? 'open' : ''}`} />
        </button>
      </div>
    </nav>
  );
}

function ProfilePage() {
  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-avatar-wrap">
            <img src="https://i.pravatar.cc/200?img=20" alt="头像" className="profile-avatar" />
            <div className="profile-avatar-ring" />
          </div>
          <h1 className="profile-name">烘焙爱好者</h1>
          <p className="profile-bio">热爱烘焙，喜欢分享美食的快乐 🧁</p>
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">12</div>
              <div className="stat-label">发布食谱</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">38</div>
              <div className="stat-label">我的收藏</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">125</div>
              <div className="stat-label">评价数</div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <Link to="/favorites" className="profile-action-btn">
            <span className="pa-icon">❤️</span>
            <span>查看我的收藏</span>
          </Link>
          <Link to="/" className="profile-action-btn">
            <span className="pa-icon">📝</span>
            <span>浏览更多食谱</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/favorites" element={<ExplorePage showFavoritesOnly />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="footer-inner">
          <span className="footer-brand">🧁 烘焙厨房</span>
          <span className="footer-copy">© 2026 烘焙爱好者的食谱分享社区</span>
        </div>
      </footer>
    </div>
  );
}
