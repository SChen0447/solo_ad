import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, User } from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-logo" onClick={() => navigate('/books')} style={{ cursor: 'pointer' }}>
        <BookOpen size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        书香阁
      </div>
      <ul className="navbar-nav">
        <li><NavLink to="/books">图书市场</NavLink></li>
        <li><NavLink to="/clubs">读书会</NavLink></li>
        <li><NavLink to="/profile">个人中心</NavLink></li>
        {currentUser?.role === 'admin' && (
          <li><NavLink to="/admin">管理面板</NavLink></li>
        )}
      </ul>
      <div className="navbar-user">
        {currentUser ? (
          <>
            <img 
              src={currentUser.avatar} 
              alt={currentUser.username}
              className="user-avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/default/100/100';
              }}
            />
            <span>{currentUser.username}</span>
            <button 
              className="btn btn-outline" 
              style={{ padding: '6px 16px', fontSize: '13px', color: 'white', borderColor: 'white' }}
              onClick={onLogout}
            >
              退出
            </button>
          </>
        ) : (
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            登录
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
