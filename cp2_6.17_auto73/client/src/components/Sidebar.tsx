import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface SidebarProps {
  nickname: string;
  avatar: string;
  onLogout: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Sidebar({ nickname, avatar, onLogout, sidebarOpen, onToggleSidebar }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={onToggleSidebar} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>学习导航</h2>
          <p>个性化学习计划管理</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" onClick={() => window.innerWidth < 768 && onToggleSidebar()}>
            📋 计划列表
          </NavLink>
          <NavLink to="/create" onClick={() => window.innerWidth < 768 && onToggleSidebar()}>
            ➕ 创建计划
          </NavLink>
          <NavLink to="/settings" onClick={() => window.innerWidth < 768 && onToggleSidebar()}>
            ⚙️ 个人设置
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {avatar ? <img src={avatar} alt="" /> : nickname?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="sidebar-username">{nickname || '用户'}</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>退出登录</button>
        </div>
      </aside>
    </>
  );
}
