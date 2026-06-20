import React from 'react';
import { Routes, Route, NavLink, useLocation, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';

const App: React.FC = () => {
  const location = useLocation();

  const getBreadcrumb = (): { label: string; link?: string }[] => {
    const path = location.pathname;
    const breadcrumbs: { label: string; link?: string }[] = [
      { label: '首页', link: '/' }
    ];

    if (path === '/upload') {
      breadcrumbs.push({ label: '上传简历' });
    } else if (path === '/analyze') {
      breadcrumbs.push({ label: '简历分析' });
    } else if (path === '/history') {
      breadcrumbs.push({ label: '历史记录' });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumb();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">📄</span>
          <span>简历优化专家</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">🏠</span>
            <span>首页</span>
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">📤</span>
            <span>上传简历</span>
          </NavLink>
          <NavLink
            to="/analyze"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            <span>简历分析</span>
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            <span>历史记录</span>
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <div className="breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {crumb.link ? (
                <Link to={crumb.link}>{crumb.label}</Link>
              ) : (
                <span className="breadcrumb-current">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="page-content">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/analyze" element={<AnalysisPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
