import React from 'react';
import type { ViewType } from '@/types';

interface BottomNavProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
}

interface NavItem {
  key: ViewType;
  label: string;
  icon: JSX.Element;
}

const navItems: NavItem[] = [
  {
    key: 'shelf',
    label: '书架',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: 'stats',
    label: '统计',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 16V9M12 16V5M17 16v-6" />
      </svg>
    ),
  },
  {
    key: 'shelf',
    label: '搜索',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
  const handleClick = (key: ViewType, idx: number) => {
    if (idx === 2) {
      onChange('shelf');
      setTimeout(() => {
        const input = document.querySelector('.search-input-wrapper input');
        input?.querySelector('input')?.focus();
      }, 100);
    } else {
      onChange(key);
    }
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item, idx) => (
      <button
        key={`${item.key}-${idx}`}
        className={`nav-item ${currentView === (idx === 2 ? false : currentView === item.key) ? 'active' : ''}`}
        onClick={() => handleClick(item.key, idx)}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </button>
    ))}
    </nav>
  );
};

export default BottomNav;
