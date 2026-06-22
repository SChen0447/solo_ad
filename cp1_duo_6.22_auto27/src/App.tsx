import React, { useEffect } from 'react';
import { useAppStore } from './store';
import PlanView from './components/PlanView';
import DiaryView from './components/DiaryView';
import AlbumView from './components/AlbumView';
import { Map, BookOpen, Image, Plus, Trash2 } from 'lucide-react';

const tabConfig = [
  { key: 'plan' as const, label: '行程规划', icon: Map },
  { key: 'diary' as const, label: '旅行日记', icon: BookOpen },
  { key: 'album' as const, label: '旅行相册', icon: Image },
];

export default function App() {
  const {
    state,
    fetchTrips,
    createTrip,
    deleteTrip,
    setCurrentTrip,
    setActiveTab,
  } = useAppStore();

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const currentTrip = state.trips.find((t) => t.id === state.currentTripId);

  const handleCreateTrip = async () => {
    const name = prompt('请输入旅行名称：');
    if (name) {
      await createTrip(name);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (confirm('确定删除这次旅行吗？')) {
      await deleteTrip(id);
    }
  };

  const tabIndex = tabConfig.findIndex((t) => t.key === state.activeTab);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>✈ 旅行日记助手</h1>
        </div>
        <div style={styles.headerRight}>
          <select
            value={state.currentTripId || ''}
            onChange={(e) => setCurrentTrip(e.target.value || null)}
            style={styles.tripSelect}
          >
            <option value="">选择旅行...</option>
            {state.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleCreateTrip}>
            <Plus size={14} /> 新建旅行
          </button>
          {currentTrip && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDeleteTrip(currentTrip.id)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {currentTrip && (
        <nav style={styles.tabNav}>
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = state.activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  ...styles.tabBtn,
                  ...(isActive ? styles.tabBtnActive : {}),
                }}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
          <div style={styles.tabIndicatorContainer}>
            <div
              style={{
                ...styles.tabIndicator,
                transform: `translateX(${tabIndex * 100}%)`,
              }}
            />
          </div>
        </nav>
      )}

      <main style={styles.main}>
        {!state.currentTripId ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🌍</div>
            <h2 style={styles.emptyTitle}>开始你的旅程</h2>
            <p style={styles.emptyDesc}>
              创建一次新的旅行，规划行程、记录日记、生成相册
            </p>
            <button className="btn btn-primary" onClick={handleCreateTrip}>
              <Plus size={16} /> 创建旅行
            </button>
          </div>
        ) : (
          <div style={styles.viewContainer}>
            <div
              style={{
                ...styles.viewSlider,
                transform: `translateX(-${tabIndex * 100}%)`,
              }}
            >
              <div style={styles.viewPanel}>
                <PlanView />
              </div>
              <div style={styles.viewPanel}>
                <DiaryView />
              </div>
              <div style={styles.viewPanel}>
                <AlbumView />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'white',
    boxShadow: '0 1px 4px rgba(44, 62, 80, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#2c3e50',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tripSelect: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #e8dcc8',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#2c3e50',
    background: 'white',
    cursor: 'pointer',
  },
  tabNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 24px',
    background: 'white',
    borderBottom: '1px solid #e8dcc8',
    position: 'relative',
  },
  tabBtn: {
    padding: '8px 20px',
    fontSize: 14,
    position: 'relative',
    zIndex: 1,
  },
  tabBtnActive: {
    boxShadow: '0 2px 8px rgba(52, 152, 219, 0.3)',
  },
  tabIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    width: 120,
    height: 3,
    background: 'transparent',
  },
  tabIndicator: {
    width: '33.33%',
    height: '100%',
    background: '#3498db',
    borderRadius: 2,
    transition: 'transform 0.3s ease',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '60vh',
    gap: 16,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#2c3e50',
  },
  emptyDesc: {
    fontSize: 14,
    color: '#7f8c8d',
    maxWidth: 300,
    textAlign: 'center' as const,
    lineHeight: 1.6,
  },
  viewContainer: {
    flex: 1,
    overflow: 'hidden',
    height: 'calc(100vh - 110px)',
  },
  viewSlider: {
    display: 'flex',
    width: '300%',
    height: '100%',
    transition: 'transform 0.3s ease',
  },
  viewPanel: {
    width: '33.33%',
    height: '100%',
    overflow: 'auto',
  },
};
