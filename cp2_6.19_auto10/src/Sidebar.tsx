import React from 'react';
import { NavKey, NavItem } from './types';

interface SidebarProps {
  activeKey: NavKey;
  onSelect: (key: NavKey) => void;
}

const navItems: NavItem[] = [
  { key: 'my-music', label: '我的音乐', icon: '♪' },
  { key: 'albums', label: '专辑库', icon: '💿' },
  { key: 'playlists', label: '播放列表', icon: '📋' },
  { key: 'recent', label: '最近播放', icon: '⏱️' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeKey, onSelect }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🎵</span>
        <span className="logo-text">MusicBox</span>
      </div>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li
              key={item.key}
              className={`nav-item ${activeKey === item.key ? 'active' : ''}`}
              onClick={() => onSelect(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
