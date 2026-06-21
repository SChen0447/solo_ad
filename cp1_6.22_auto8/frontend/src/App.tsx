import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import BatchList from './pages/BatchList';
import NewBatch from './pages/NewBatch';
import Compare from './pages/Compare';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #4A2C1A, #2E1A0F)',
      color: '#fff',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1000,
      boxShadow: '0 2px 16px rgba(0, 0, 0, 0.2)',
    }}>
      <Link to="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#fff',
        textDecoration: 'none',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D2691E, #8B4513)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          ☕
        </div>
        <span style={{
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          display: 'none',
        }} className="logo-text">
          Coffee Roast Logger
        </span>
      </Link>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }} className="nav-links">
        <Link
          to="/"
          style={{
            color: isActive('/') ? '#FFD700' : '#fff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            background: isActive('/') ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
        >
          历史记录
        </Link>
        <Link
          to="/new"
          style={{
            color: isActive('/new') ? '#FFD700' : '#fff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            background: isActive('/new') ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
        >
          新建批次
        </Link>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'transparent',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          登录
        </button>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #A0522D, #654321)',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          👤
        </div>
      </div>

      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
        }}
        className="menu-button"
      >
        {isMenuOpen ? '✕' : '☰'}
      </button>

      {isMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #4A2C1A, #2E1A0F)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }} className="mobile-menu">
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            style={{
              color: isActive('/') ? '#FFD700' : '#fff',
              textDecoration: 'none',
              fontSize: '15px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: isActive('/') ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
          >
            历史记录
          </Link>
          <Link
            to="/new"
            onClick={() => setIsMenuOpen(false)}
            style={{
              color: isActive('/new') ? '#FFD700' : '#fff',
              textDecoration: 'none',
              fontSize: '15px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: isActive('/new') ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
          >
            新建批次
          </Link>
          <button
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: '#fff',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            登录
          </button>
        </div>
      )}

      <style>{`
        @media (min-width: 769px) {
          .logo-text {
            display: inline !important;
          }
        }
        @media (max-width: 768px) {
          .nav-links {
            display: none !important;
          }
          .menu-button {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        background: '#F5EDE0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        <Navbar />
        <main style={{ paddingTop: '80px', paddingBottom: '40px' }}>
          <Routes>
            <Route path="/" element={<BatchList />} />
            <Route path="/new" element={<NewBatch />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
