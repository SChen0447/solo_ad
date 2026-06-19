import { Routes, Route, Link, useLocation } from 'react-router-dom';
import RecipeList from './pages/RecipeList';
import RecipeDetail from './pages/RecipeDetail';
import RecipePublish from './pages/RecipePublish';
import Profile from './pages/Profile';

function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">🍲</span>
          <span className="logo-text">味觉厨房</span>
        </Link>
        <div className="nav-actions">
          {!isHome && (
            <Link to="/" className="nav-btn ghost">
              探索
            </Link>
          )}
          <Link to="/publish" className="nav-btn primary">
            <span>＋</span> 发布食谱
          </Link>
          <Link to="/profile" className="nav-btn icon-btn" title="个人中心">
            <span>👤</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/publish" element={<RecipePublish />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>© 2026 味觉厨房 · 分享每一道私房菜 🍳</p>
      </footer>
    </div>
  );
}

export default App;
