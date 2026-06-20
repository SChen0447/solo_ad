import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: '#FFF9F0',
  borderBottom: '1px solid #F0E6D6',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  height: 56,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const logoStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#FF6B35',
  marginRight: 32,
  textDecoration: 'none',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const linkBase: React.CSSProperties = {
  textDecoration: 'none',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.15s, color 0.15s',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export default function Navbar() {
  const location = useLocation();

  const getLinkStyle = (path: string): React.CSSProperties => ({
    ...linkBase,
    color: location.pathname === path ? '#FF6B35' : '#666',
    background: location.pathname === path ? '#FFF0E5' : 'transparent',
  });

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>邻里闲享</Link>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Link to="/" style={getLinkStyle('/')}>闲置交换</Link>
        <Link to="/qna" style={getLinkStyle('/qna')}>社区问答</Link>
        <Link to="/profile/user1" style={getLinkStyle('/profile/user1')}>我的</Link>
      </div>
    </nav>
  );
}
