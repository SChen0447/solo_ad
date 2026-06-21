import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { BookOpen, User, Crown, Home } from 'lucide-react';
import HomePage from './pages/HomePage';
import MemberPage from './pages/MemberPage';
import AdminPage from './pages/AdminPage';
import MemberDetailPage from './pages/MemberDetailPage';

function App() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayLocation(location);
      setTransitionStage('fadeIn');
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <BookOpen size={28} className="brand-icon" />
          <span>书友会管理系统</span>
        </div>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <Home size={18} />
            <span>活动日历</span>
          </NavLink>
          <NavLink to="/member/mem-001" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <User size={18} />
            <span>会员中心</span>
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <Crown size={18} />
            <span>店主后台</span>
          </NavLink>
        </div>
      </nav>
      <main
        className={`page-content ${transitionStage}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<HomePage />} />
          <Route path="/member/:id" element={<MemberPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/member/:id" element={<MemberDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
