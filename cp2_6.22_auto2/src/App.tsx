import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { Gift, Stats } from '@/types';
import { fetchGifts, fetchStats } from '@/utils/storage';
import GiftForm from '@/components/GiftForm';
import GiftGallery from '@/components/GiftGallery';
import DetailPage from '@/pages/DetailPage';
import ExchangePage from '@/pages/ExchangePage';

const TABS = [
  { key: 'dashboard', label: '看板', path: '/' },
  { key: 'gifts', label: '礼物', path: '/gifts' },
  { key: 'exchange', label: '交换', path: '/exchange' },
];

const NavBar: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeTab = TABS.find((t) => t.path === location.pathname) || TABS[0];

  useEffect(() => {
    const idx = TABS.indexOf(activeTab);
    const btn = tabRefs.current[idx];
    if (btn && indicatorRef.current) {
      indicatorRef.current.style.left = `${btn.offsetLeft}px`;
      indicatorRef.current.style.width = `${btn.offsetWidth}px`;
    }
  }, [activeTab]);

  const handleNav = useCallback(
    (path: string) => {
      navigate(path);
      setMenuOpen(false);
    },
    [navigate]
  );

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <span className="navbar__brand">漂流礼物</span>

        <button
          className="navbar__hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar__tabs ${menuOpen ? 'navbar__tabs--open' : ''}`}>
          {TABS.map((tab, idx) => (
            <button
              key={tab.key}
              ref={(el) => { tabRefs.current[idx] = el; }}
              className={`navbar__tab ${activeTab.key === tab.key ? 'navbar__tab--active' : ''}`}
              onClick={() => handleNav(tab.path)}
            >
              {tab.label}
            </button>
          ))}
          <div ref={indicatorRef} className="navbar__indicator" />
        </div>
      </div>
    </nav>
  );
});

NavBar.displayName = 'NavBar';

const Dashboard: React.FC = React.memo(() => {
  const [stats, setStats] = useState<Stats>({ total: 0, exchanged: 0, inTransit: 0 });
  const [animating, setAnimating] = useState(false);
  const prevStats = useRef(stats);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      prevStats.current = stats;
      setStats(data);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
    } catch {
      // silently fail
    }
  }, [stats]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { icon: '🎁', label: '总礼物数', value: stats.total },
    { icon: '🤝', label: '已成功交换', value: stats.exchanged },
    { icon: '📦', label: '物流中', value: stats.inTransit },
  ];

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">综合看板</h2>
      <div className="dashboard__cards">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-card__icon">{card.icon}</div>
            <div className={`stat-card__value ${animating ? 'stat-card__value--anim' : ''}`}>
              {card.value}
            </div>
            <div className="stat-card__label">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

const GiftsPage: React.FC = React.memo(() => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGifts = useCallback(async () => {
    try {
      const data = await fetchGifts();
      setGifts(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  return (
    <div className="gifts-page">
      <GiftForm onGiftAdded={loadGifts} />
      {loading ? (
        <div className="page-loading">加载中...</div>
      ) : (
        <GiftGallery gifts={gifts} />
      )}
    </div>
  );
});

GiftsPage.displayName = 'GiftsPage';

const AppContent: React.FC = React.memo(() => {
  return (
    <div className="app">
      <NavBar />
      <main className="app__main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gifts" element={<GiftsPage />} />
          <Route path="/gift/:id" element={<DetailPage />} />
          <Route path="/exchange" element={<ExchangePage />} />
        </Routes>
      </main>
    </div>
  );
});

AppContent.displayName = 'AppContent';

const App: React.FC = React.memo(() => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
});

App.displayName = 'App';

export default App;
