import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { usePetStore } from './store/petStore';
import Home from './pages/Home';
import PetDetail from './pages/PetDetail';
import Store from './pages/Store';
import NotificationBar from './components/NotificationBar';
import InteractionLog from './components/InteractionLog';

const NAV_LINKS = [
  { to: '/home', label: '首页' },
  { to: '/pet', label: '宠物' },
  { to: '/store', label: '商店' },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <div style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '2px',
      }}>
        🐾 PetWorld
      </div>
      <div className="nav-links-desktop" style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              color: '#fff',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 600,
              paddingBottom: '4px',
              borderBottom: isActive ? '2px solid #f5a623' : '2px solid transparent',
              transition: 'border-color 0.3s ease',
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
        }}
      >
        <div style={{ width: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ display: 'block', height: '3px', background: '#fff', borderRadius: '2px' }} />
          <span style={{ display: 'block', height: '3px', background: '#fff', borderRadius: '2px' }} />
          <span style={{ display: 'block', height: '3px', background: '#fff', borderRadius: '2px' }} />
        </div>
      </button>
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: 0,
          background: '#2c3e50',
          width: '200px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1001,
        }}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                color: '#fff',
                textDecoration: 'none',
                padding: '14px 20px',
                fontWeight: 600,
                fontSize: '15px',
                borderBottom: isActive ? '2px solid #f5a623' : 'none',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}

function CoinsDisplay() {
  const coins = usePetStore((s) => s.coins);
  return (
    <div style={{
      position: 'fixed',
      top: '68px',
      right: '24px',
      background: '#fff',
      padding: '6px 16px',
      borderRadius: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontSize: '14px',
      fontWeight: 700,
      color: '#f1c40f',
      zIndex: 999,
    }}>
      💰 {coins} 金币
    </div>
  );
}

function AppContent() {
  const fetchPets = usePetStore((s) => s.fetchPets);
  const decayPetStats = usePetStore((s) => s.decayPetStats);
  const location = useLocation();

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  useEffect(() => {
    const interval = setInterval(() => {
      decayPetStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [decayPetStats]);

  return (
    <div style={{ background: '#fff8f0', minHeight: '100vh' }}>
      <Navbar />
      <NotificationBar />
      <CoinsDisplay />
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px 24px',
      }}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/pet/:id" element={<PetDetail />} />
          <Route path="/pet" element={<Home />} />
          <Route path="/store" element={<Store />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
      <InteractionLog />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
