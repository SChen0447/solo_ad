import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import AuctionList from './pages/AuctionList';
import AuctionDetail from './pages/AuctionDetail';
import MyStats from './pages/MyStats';
import BidPanel from './components/BidPanel';
import './App.css';

export default function App() {
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showPanelOnDesktop = isDesktop && location.pathname !== '/stats';

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <NavLink to="/" className="logo-link">
            <span className="logo-icon">🔨</span>
            <div className="logo-text">
              <span className="logo-title">拍卖云</span>
              <span className="logo-sub">REALTIME AUCTION</span>
            </div>
          </NavLink>

          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🏠</span>
              <span className="nav-text">拍卖大厅</span>
            </NavLink>
            <NavLink to="/stats" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🏆</span>
              <span className="nav-text">我的战绩</span>
            </NavLink>
          </nav>

          <div className="header-actions">
            {!isDesktop && (
              <button
                className="panel-toggle-btn"
                onClick={() => setPanelOpen(true)}
                title="我的竞价"
              >
                <span>🎯</span>
                <span className="toggle-dot"></span>
              </button>
            )}
            <div className="user-avatar">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=me" alt="用户头像" />
              <div className="user-status"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className={`main-content ${showPanelOnDesktop ? 'with-panel' : ''}`}>
          <Routes>
            <Route path="/" element={<AuctionList />} />
            <Route path="/auction/:id" element={<AuctionDetail />} />
            <Route path="/stats" element={<MyStats />} />
            <Route path="*" element={<AuctionList />} />
          </Routes>
        </div>

        {showPanelOnDesktop && (
          <BidPanel isOpen={true} onClose={() => {}} />
        )}
        {!isDesktop && (
          <BidPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2025 在线拍卖实时竞价系统 · 所有数据均为演示用途</p>
      </footer>
    </div>
  );
}
