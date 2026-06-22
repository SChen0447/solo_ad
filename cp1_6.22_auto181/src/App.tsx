import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ComponentGrid from './browser/ComponentGrid';
import ComponentDetail from './detail/ComponentDetail';
import './styles/layout.css';

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🧩</span>
            <span className="logo-text">组件工坊</span>
          </div>
        </div>
        <div className="sidebar-menu">
          <Link to="/" className={`menu-item ${location.pathname === '/' ? 'active' : ''}`}>
            <span className="menu-icon">📦</span>
            <span>组件浏览</span>
          </Link>
          <div className="menu-section-title">分类</div>
          <Link to="/" className="menu-item">
            <span className="menu-icon">📝</span>
            <span>表单组件</span>
          </Link>
          <Link to="/" className="menu-item">
            <span className="menu-icon">📊</span>
            <span>图表组件</span>
          </Link>
          <Link to="/" className="menu-item">
            <span className="menu-icon">🎨</span>
            <span>布局组件</span>
          </Link>
          <Link to="/" className="menu-item">
            <span className="menu-icon">💬</span>
            <span>反馈组件</span>
          </Link>
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">D</div>
            <div className="user-details">
              <div className="user-name">开发者</div>
              <div className="user-role">前端工程师</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>
        <div className="mobile-logo">
          <span className="logo-icon">🧩</span>
          <span className="logo-text">组件工坊</span>
        </div>
        <div style={{ width: '32px' }} />
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="logo-icon">🧩</span>
              <span className="logo-text">组件工坊</span>
              <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>×</button>
            </div>
            <Link to="/" className={`menu-item ${location.pathname === '/' ? 'active' : ''}`}>
              <span className="menu-icon">📦</span>
              <span>组件浏览</span>
            </Link>
            <Link to="/" className="menu-item">
              <span className="menu-icon">📝</span>
              <span>表单组件</span>
            </Link>
            <Link to="/" className="menu-item">
              <span className="menu-icon">📊</span>
              <span>图表组件</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ComponentGrid />} />
            <Route path="/component/:id" element={<ComponentDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
