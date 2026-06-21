import { useEffect, useState, useCallback } from 'react';
import ManagePage from './pages/ManagePage';
import StatsCards from './components/StatsCards';
import LoanTable from './components/LoanTable';
import { statsApi } from './api';
import type { Stats } from './types';

function App() {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    borrowedCount: 0,
    overdueCount: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const data = await statsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('获取统计数据失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const handleDataChange = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>📚 图书库存管理系统</h1>
        <p style={styles.subtitle}>轻量级书店与社区图书馆管理工具</p>
      </header>

      <main style={styles.main}>
        <StatsCards stats={stats} />
        <ManagePage
          onDataChange={handleDataChange}
          refreshTrigger={refreshKey}
        />
        <LoanTable
          onDataChange={handleDataChange}
          refreshTrigger={refreshKey}
        />
      </main>

      <footer style={styles.footer}>
        <p>© 2026 图书库存管理系统 · 数据本地存储</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px 32px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
    animation: 'fadeIn 0.5s ease',
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: '#2b6cb0',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  footer: {
    textAlign: 'center',
    marginTop: 48,
    padding: '24px 0',
    borderTop: '1px solid #e2e8f0',
    color: '#a0aec0',
    fontSize: 13,
  },
};

export default App;
