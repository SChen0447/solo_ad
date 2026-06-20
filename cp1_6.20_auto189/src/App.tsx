import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardPage from './dashboard/DashboardPage';
import GoalsPage from './goals/GoalsPage';
import { useTheme } from './context/ThemeContext';
import './App.css';

function App() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">⚔️ 战斗统计仪表盘</h1>
        </div>
        <nav className="app-nav">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/' || location.pathname === '/dashboard' ? 'active' : ''}`}>
            仪表盘
          </Link>
          <Link to="/goals" className={`nav-link ${location.pathname === '/goals' ? 'active' : ''}`}>
            成就目标
          </Link>
        </nav>
        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? '切换暗色主题' : '切换亮色主题'}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/goals" element={<GoalsPage />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
