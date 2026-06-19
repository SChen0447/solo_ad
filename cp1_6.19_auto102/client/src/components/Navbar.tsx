import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🍳</span>
          <span className="logo-text">私房菜谱</span>
        </Link>

        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="搜索菜谱或食材..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">🔍</button>
        </form>

        <div className="navbar-nav">
          <Link to="/" className="nav-item">
            <span className="nav-icon">🏠</span>
            <span className="nav-text">首页</span>
          </Link>
          <Link to="/editor" className="nav-item create-btn">
            <span className="nav-icon">✏️</span>
            <span className="nav-text">创作</span>
          </Link>
          {user ? (
            <>
              <Link to={`/profile/${user.id}`} className="nav-item">
                <span className="nav-icon">👤</span>
                <span className="nav-text">我的</span>
              </Link>
              <button className="nav-item logout-btn" onClick={handleLogout}>
                <span className="nav-icon">🚪</span>
                <span className="nav-text">退出</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-item">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">登录</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
