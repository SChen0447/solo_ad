import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import axios from 'axios';
import RoutePlanner from './planner/RoutePlanner';
import TripReport from './report/TripReport';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

function HistoryPage() {
  const navigate = useNavigate();
  const { data: routes, mutate } = useSWR('/api/routes', fetcher);

  const createNewRoute = async () => {
    try {
      const res = await axios.post('/api/routes', { name: '新自驾路线' });
      mutate();
      navigate(`/planner?routeId=${res.data.id}`);
    } catch (err) {
      console.error('Failed to create route:', err);
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      await axios.delete(`/api/routes/${id}`);
      mutate();
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🚗 我的自驾旅程</h1>
        <button style={styles.createBtn} onClick={createNewRoute}>
          + 创建新路线
        </button>
      </div>

      <div style={styles.routeList}>
        {routes && routes.length > 0 ? (
          routes.map((route: any) => (
            <div key={route.id} style={styles.routeCard}>
              <div style={styles.routeInfo}>
                <h3 style={styles.routeName}>{route.name}</h3>
                <p style={styles.routeMeta}>
                  {route.waypoints?.length || 0} 个途经点 ·{' '}
                  {new Date(route.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div style={styles.routeActions}>
                <button
                  style={styles.actionBtn}
                  onClick={() => navigate(`/planner?routeId=${route.id}`)}
                >
                  编辑路线
                </button>
                <button
                  style={{ ...styles.actionBtn, ...styles.reportBtn }}
                  onClick={() => navigate(`/report/${route.id}`)}
                >
                  查看报告
                </button>
                <button
                  style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                  onClick={() => deleteRoute(route.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>还没有任何路线</p>
            <p style={styles.emptySubtext}>点击上方按钮开始规划你的第一次自驾之旅</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlannerPage() {
  return <RoutePlanner />;
}

function ReportPage() {
  return <TripReport />;
}

export default function App() {
  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>
          🚗 自驾路线规划
        </Link>
        <div style={styles.navLinks}>
          <Link to="/" style={styles.navLink}>
            历史旅程
          </Link>
          <Link to="/planner" style={styles.navLink}>
            路线规划
          </Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HistoryPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/report/:routeId" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    background: '#16213e',
    borderBottom: '1px solid #0f3460',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#e2e8f0',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '24px',
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 500ms ease-out',
  },
  page: {
    flex: 1,
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  createBtn: {
    padding: '12px 24px',
    background: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'filter 500ms ease-out',
  },
  routeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  routeCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    background: '#0f3460',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  routeInfo: {},
  routeName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '8px',
  },
  routeMeta: {
    fontSize: '14px',
    color: '#64748b',
  },
  routeActions: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 500ms ease-out',
  },
  reportBtn: {
    color: '#10b981',
    borderColor: '#10b981',
  },
  deleteBtn: {
    color: '#f97316',
    borderColor: '#f97316',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 0',
  },
  emptyText: {
    fontSize: '18px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#64748b',
  },
};
