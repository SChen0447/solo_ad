import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import RecordsPage from './modules/records/RecordsPage';
import FavoritesPage from './modules/favorites/FavoritesPage';
import ReportPage from './modules/report/ReportPage';

export default function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">MindTrace</span>
        </div>
        <div className="navbar-links">
          <NavLink to="/records" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            主页
          </NavLink>
          <NavLink to="/favorites" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            收藏夹
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            情绪报告
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/records" replace />} />
        </Routes>
      </main>
    </div>
  );
}
