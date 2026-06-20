import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import UserProfile from './pages/UserProfile';
import type { Course } from './api';
import { fetchCourses } from './api';

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (err) {
      console.error('加载课程失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCourseEnrollment = (courseId: number, enrolled: number, remaining: number) => {
    setCourses(prev =>
      prev.map(c =>
        c.id === courseId ? { ...c, enrolled, remaining } : c
      )
    );
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => `
    nav-link relative px-4 py-2 text-sm font-medium transition-all duration-200
    ${isActive ? 'text-[#D2691E]' : 'text-[#5D4037] hover:text-[#D2691E]'}
  `;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          color: #3E2723;
          min-height: 100vh;
          background-color: #F5F0E1;
          background-image:
            repeating-linear-gradient(0deg, rgba(139,69,19,0.03) 0px, rgba(139,69,19,0.03) 1px, transparent 1px, transparent 24px),
            repeating-linear-gradient(90deg, rgba(139,69,19,0.03) 0px, rgba(139,69,19,0.03) 1px, transparent 1px, transparent 24px);
        }
        .app-container { padding-top: 70px; min-height: 100vh; }
        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(139,69,19,0.1);
        }
        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 700;
          color: #8B4513;
          cursor: pointer;
        }
        .logo-icon { font-size: 28px; }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 2px;
          background: linear-gradient(90deg, #FF8C00, #FF69B4);
          transition: all 0.2s ease;
          border-radius: 2px;
        }
        .nav-link.active::after,
        .nav-link:hover::after { width: 70%; }
        .nav-link.active::after { width: 70%; }
        .avatar-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D2691E, #FF8C00);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          box-shadow: 0 2px 8px rgba(210,105,30,0.3);
        }
        .avatar-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(210,105,30,0.4);
        }
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
          cursor: pointer;
          background: none;
          border: none;
        }
        .hamburger span {
          width: 22px;
          height: 2px;
          background: #8B4513;
          border-radius: 2px;
          transition: all 0.2s ease;
        }
        .mobile-menu {
          display: none;
          flex-direction: column;
          padding: 0 24px 16px;
          gap: 8px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-link {
          padding: 12px 16px;
          color: #5D4037;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .mobile-link:hover, .mobile-link.active {
          background: rgba(210,105,30,0.1);
          color: #D2691E;
        }
        .page-transition {
          animation: slideInRight 0.3s ease;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease; }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .btn-primary {
          background: linear-gradient(135deg, #D2691E, #E07A2F);
          color: white;
          box-shadow: 0 2px 8px rgba(210,105,30,0.25);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #B85C1A, #D2691E);
          box-shadow: 0 4px 12px rgba(210,105,30,0.35);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .btn-secondary {
          background: #F5F0E1;
          color: #8B4513;
          border: 1px solid rgba(139,69,19,0.2);
        }
        .btn-secondary:hover {
          transform: translateY(-1px);
          background: #EDE5D0;
        }
        .btn-danger {
          background: #FFF3F3;
          color: #C62828;
          border: 1px solid rgba(198,40,40,0.2);
        }
        .btn-danger:hover {
          transform: translateY(-1px);
          background: #FFE5E5;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.3s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .input-field {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid rgba(139,69,19,0.2);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
          background: white;
          color: #3E2723;
        }
        .input-field:focus {
          outline: none;
          border-color: #D2691E;
          box-shadow: 0 0 0 3px rgba(210,105,30,0.15);
        }
        .input-field.error {
          border-color: #E53935;
          animation: shake 0.2s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(139,69,19,0.08);
          transition: all 0.2s ease;
        }
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(210,105,30,0.2);
          border-top-color: #D2691E;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        .toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          background: #4CAF50;
          color: white;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          z-index: 200;
          animation: fadeIn 0.3s ease;
        }
        .toast.error { background: #E53935; }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          animation: fadeIn 0.2s ease;
        }
        .modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #3E2723;
          margin-bottom: 12px;
        }
        .modal-text {
          color: #5D4037;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        @media (max-width: 1023px) {
          .content-wrapper { padding: 20px; }
        }
        @media (max-width: 767px) {
          .nav-links { display: none; }
          .hamburger { display: flex; }
          .content-wrapper { padding: 16px; }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-inner">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon">🎨</span>
            <span>匠心工坊</span>
          </div>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => navLinkClass({ isActive }) + (isActive ? ' active' : '')}>
              课程列表
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => navLinkClass({ isActive }) + (isActive ? ' active' : '')}>
              个人中心
            </NavLink>
            <NavLink to="/profile" title="个人中心">
              <button className="avatar-btn">👤</button>
            </NavLink>
          </div>

          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <span style={menuOpen ? { transform: 'rotate(45deg) translate(5px,5px)' } : {}} />
            <span style={menuOpen ? { opacity: 0 } : {}} />
            <span style={menuOpen ? { transform: 'rotate(-45deg) translate(5px,-5px)' } : {}} />
          </button>
        </div>

        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            📚 课程列表
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            👤 个人中心
          </NavLink>
        </div>
      </nav>

      <div className="app-container">
        <div className="content-wrapper page-transition" key={location.pathname}>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<CourseList courses={courses} />} />
              <Route
                path="/course/:id"
                element={
                  <CourseDetail
                    courses={courses}
                    updateCourseEnrollment={updateCourseEnrollment}
                    refreshCourses={loadCourses}
                  />
                }
              />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          )}
        </div>
      </div>
    </>
  );
}
