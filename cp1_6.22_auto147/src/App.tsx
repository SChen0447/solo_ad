import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { api } from './api';
import type { User } from './types';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import ProfilePage from './pages/ProfilePage';
import './styles.css';

function Nav({ user }: { user: User | null }) {
  const loc = useLocation();
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">🎓</span>
          <span>学习小组</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${loc.pathname === '/' ? 'active' : ''}`}>
            小组广场
          </Link>
          {user && (
            <Link
              to={`/profile/${user.id}`}
              className={`nav-link ${loc.pathname.startsWith('/profile') ? 'active' : ''}`}
            >
              <img src={user.avatar} alt="" className="nav-avatar" />
              <span>我的主页</span>
              <span className="nav-points">{user.totalPoints}分</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const me = await api.getCurrentUser();
      setUser(me);
    })();
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <Nav user={user} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage currentUser={user} onUserUpdate={setUser} />} />
            <Route path="/group/:id" element={<GroupPage currentUser={user} onUserUpdate={setUser} />} />
            <Route path="/profile/:id" element={<ProfilePage currentUser={user} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
