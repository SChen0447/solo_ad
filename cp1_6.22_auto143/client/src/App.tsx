import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import GaragePage from './pages/GaragePage';
import TrackPage from './pages/TrackPage';
import { PartSelection, CarStats, SavedSetup, Part, PartCategory } from './types';
import { api } from './api';

interface AppState {
  selection: PartSelection;
  stats: CarStats;
  parts: Record<PartCategory, Part[]>;
  setups: SavedSetup[];
  updateSelection: (sel: PartSelection) => Promise<void>;
  applySetup: (setup: SavedSetup) => void;
  refreshSetups: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function AppProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<PartSelection>({
    engine: 'engine-balanced',
    tire: 'tire-hard',
    suspension: 'suspension-balanced',
    wing: 'wing-balanced'
  });
  const [stats, setStats] = useState<CarStats>({
    acceleration: 25,
    topSpeed: 25,
    grip: 25,
    cornering: 25
  });
  const [parts, setParts] = useState<Record<PartCategory, Part[]>>({
    engine: [],
    tire: [],
    suspension: [],
    wing: []
  });
  const [setups, setSetups] = useState<SavedSetup[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [partsData, setupResult, setupsList] = await Promise.all([
          api.getParts(),
          api.calculateStats(selection),
          api.getSetups()
        ]);
        setParts(partsData);
        setStats(setupResult.stats);
        setSetups(setupsList);
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSelection = async (sel: PartSelection) => {
    setSelection(sel);
    try {
      const result = await api.calculateStats(sel);
      setStats(result.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const applySetup = (setup: SavedSetup) => {
    setSelection(setup.selection);
    setStats(setup.stats);
  };

  const refreshSetups = async () => {
    try {
      const list = await api.getSetups();
      setSetups(list);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider value={{ selection, stats, parts, setups, updateSelection, applySetup, refreshSetups }}>
      {children}
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app-container">
          <header className="app-header">
            <div className="app-logo">
              <span>🏎️</span>
              <span>赛车改装工坊</span>
            </div>
            <nav className="app-nav">
              <NavLink to="/garage" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                改装工坊
              </NavLink>
              <NavLink to="/track" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                赛道匹配
              </NavLink>
            </nav>
          </header>
          <main className="app-main">
            <div className="page-container">
              <Routes>
                <Route path="/" element={<Navigate to="/garage" replace />} />
                <Route path="/garage" element={<GaragePage />} />
                <Route path="/track" element={<TrackPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
