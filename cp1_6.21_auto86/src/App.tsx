import { useState, useEffect } from 'react';
import { BookOpen, CalendarDays } from 'lucide-react';
import RecordPanel from './components/RecordPanel';
import StatsDashboard from './components/StatsDashboard';
import { getTodayMinutes, getTotalDays } from './utils/storage';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    setTodayMinutes(getTodayMinutes());
    setTotalDays(getTotalDays());
  }, [refreshKey]);

  const handleRecordAdded = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideInFade {
          0% { transform: translateX(-60px); opacity: 0; }
          30% { transform: translateX(0); opacity: 1; }
          70% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(20px); opacity: 0; }
        }
        @media (max-width: 767px) {
          .app-layout { flex-direction: column !important; }
          .app-layout > div { width: 100% !important; min-width: 0 !important; }
          .top-stats { flex-direction: column !important; gap: 12px !important; }
        }
        button:hover { transform: translateY(-1px); }
        .record-panel:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important; }
      `}</style>

      <div style={styles.topBar}>
        <h1 style={styles.appTitle}>
          <BookOpen size={24} style={{ marginRight: 8 }} />
          阅读追踪器
        </h1>
        <div className="top-stats" style={styles.topStats}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{todayMinutes}</div>
            <div style={styles.statLabel}>
              <CalendarDays size={12} style={{ marginRight: 4 }} />
              今日已读（分钟）
            </div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <div style={styles.statValueSecondary}>{totalDays}</div>
            <div style={styles.statLabel}>
              <CalendarDays size={12} style={{ marginRight: 4 }} />
              累计打卡天数
            </div>
          </div>
        </div>
      </div>

      <div className="app-layout" style={styles.layout}>
        <div style={styles.leftPanel} className="record-panel">
          <RecordPanel onRecordAdded={handleRecordAdded} />
        </div>
        <div style={styles.rightPanel}>
          <StatsDashboard refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '24px',
  },
  topBar: {
    maxWidth: 1100,
    margin: '0 auto 24px',
    background: '#fff',
    borderRadius: 8,
    padding: '20px 28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 16,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1E88E5',
    display: 'flex',
    alignItems: 'center',
    margin: 0,
  },
  topStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  statItem: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1E88E5',
    lineHeight: 1.2,
  },
  statValueSecondary: {
    fontSize: 24,
    fontWeight: 600,
    color: '#666',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    background: '#eee',
  },
  layout: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  leftPanel: {
    width: 320,
    minWidth: 300,
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    minWidth: 0,
  },
};
