import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <button className="menu-btn" onClick={onMenuClick}>
          ☰
        </button>
        <span>🎓 社团招新系统</span>
      </div>
      <div className="navbar-user" ref={dropdownRef}>
        <span className="text-secondary" style={{ fontSize: '14px' }}>
          {user?.name}
        </span>
        <div
          className="user-avatar"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {user && getInitials(user.name)}
        </div>
        {showDropdown && (
          <div className="user-dropdown">
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
            {user?.email}
          </div>
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            角色：{user?.role === 'admin' ? '管理员' : '学生'}
          </div>
          <button onClick={logout}>退出登录</button>
          </div>
        )}
      </div>
    </nav>
  );
}
