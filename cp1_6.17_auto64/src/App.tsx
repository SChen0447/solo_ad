import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Tracker from './pages/Tracker';
import { ReadingBook, getReadingList } from './api';

interface GlobalState {
  readingList: ReadingBook[];
  setReadingList: (list: ReadingBook[]) => void;
  refreshReadingList: () => Promise<void>;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  initialized: boolean;
}

const GlobalContext = createContext<GlobalState | null>(null);

export const useGlobal = () => {
  const ctx = useContext(GlobalContext);
  if (!ctx) throw new Error('useGlobal must be used within GlobalProvider');
  return ctx;
};

function GlobalProvider({ children }: { children: ReactNode }) {
  const [readingList, setReadingList] = useState<ReadingBook[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const refreshReadingList = async () => {
    try {
      const res = await getReadingList();
      setReadingList(res.list);
    } catch (e) {
      console.error('Failed to refresh reading list', e);
    }
  };

  useEffect(() => {
    refreshReadingList().finally(() => setInitialized(true));
  }, []);

  return (
    <GlobalContext.Provider value={{ readingList, setReadingList, refreshReadingList, selectedTags, setSelectedTags, initialized }}>
      {children}
    </GlobalContext.Provider>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        padding: '8px 20px',
        borderRadius: '8px',
        fontWeight: 500,
        color: isActive ? '#fff' : '#555',
        background: isActive ? '#F5A623' : 'transparent',
        transition: 'all 0.3s',
        fontSize: '15px'
      }}
    >
      {children}
    </Link>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #F5A623, #F7B94F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '22px',
              fontWeight: 700
            }}
          >
            书
          </div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#333' }}>书香阁</span>
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          <NavLink to="/">发现好书</NavLink>
          <NavLink to="/tracker">阅读进度</NavLink>
        </nav>
      </header>
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer style={{ textAlign: 'center', padding: '24px', color: '#999', fontSize: '13px' }}>
        © 2026 书香阁 · 发现你的下一本好书
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <GlobalProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tracker" element={<Tracker />} />
          </Routes>
        </Layout>
      </GlobalProvider>
    </Router>
  );
}
