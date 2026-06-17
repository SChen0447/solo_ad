import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import type { Character, CharacterRelation, TimelineEvent, Chapter, Volume } from './types';
import * as api from './apiService';
import TimelineView from './components/TimelineView';
import CharacterGraph from './components/CharacterGraph';
import ChapterEditor from './components/ChapterEditor';

interface AppContextType {
  characters: Character[];
  relations: CharacterRelation[];
  events: TimelineEvent[];
  chapters: Chapter[];
  volumes: Volume[];
  loading: boolean;
  refreshData: () => Promise<void>;
  updateEvent: (id: string, event: Partial<TimelineEvent>) => Promise<void>;
  updateChapter: (id: string, chapter: Partial<Chapter>) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

function AppProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relations, setRelations] = useState<CharacterRelation[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [chars, rels, evts, chaps, vols] = await Promise.all([
        api.getCharacters(),
        api.getRelations(),
        api.getTimelineEvents(),
        api.getChapters(),
        api.getVolumes(),
      ]);
      setCharacters(chars);
      setRelations(rels);
      setEvents(evts);
      setChapters(chaps);
      setVolumes(vols);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (id: string, event: Partial<TimelineEvent>) => {
    try {
      const updated = await api.updateTimelineEvent(id, event);
      setEvents(prev => prev.map(e => e.id === id ? updated : e));
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const updateChapter = async (id: string, chapter: Partial<Chapter>) => {
    try {
      const updated = await api.updateChapter(id, chapter);
      setChapters(prev => prev.map(c => c.id === id ? updated : c));
    } catch (error) {
      console.error('Failed to update chapter:', error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        characters,
        relations,
        events,
        chapters,
        volumes,
        loading,
        refreshData,
        updateEvent,
        updateChapter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/timeline', label: '时间线视图', icon: '📅' },
    { path: '/characters', label: '角色图谱', icon: '👥' },
    { path: '/chapters', label: '章节大纲', icon: '📖' },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>📜</span>
        <span style={styles.logoText}>小说脉络</span>
      </div>
      <nav style={styles.nav}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              ...styles.navItem,
              ...(location.pathname === item.path ? styles.navItemActive : {}),
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={styles.sidebarFooter}>
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{12}</span>
            <span style={styles.statLabel}>事件</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{8}</span>
            <span style={styles.statLabel}>角色</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{10}</span>
            <span style={styles.statLabel}>章节</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function App() {
  return (
    <AppProvider>
      <div style={styles.app}>
        <Sidebar />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<TimelineView />} />
            <Route path="/timeline" element={<TimelineView />} />
            <Route path="/characters" element={<CharacterGraph />} />
            <Route path="/chapters" element={<ChapterEditor />} />
            <Route path="/chapters/:chapterId" element={<ChapterEditor />} />
          </Routes>
        </main>
      </div>
    </AppProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    minWidth: '280px',
    backgroundColor: '#172033',
    borderRight: '1px solid #2D3A4F',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease-in-out',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid #2D3A4F',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F59E0B',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#94A3B8',
    textDecoration: 'none',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
  },
  navItemActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#FBBF24',
  },
  navIcon: {
    fontSize: '20px',
    width: '24px',
    textAlign: 'center',
  },
  navLabel: {
    fontSize: '14px',
    fontWeight: 500,
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #2D3A4F',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statNumber: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748B',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
};

export default App;
