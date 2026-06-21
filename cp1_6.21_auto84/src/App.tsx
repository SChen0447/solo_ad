import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import InquiryPanel from './pages/InquiryPanel';
import './styles/App.css';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">艺术家作品集</span>
          </Link>
          <nav className="nav">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              作品展示
            </Link>
            <Link
              to="/inquiry-panel"
              className={`nav-link ${location.pathname === '/inquiry-panel' ? 'active' : ''}`}
            >
              询价管理
            </Link>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/inquiry-panel" element={<InquiryPanel />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
