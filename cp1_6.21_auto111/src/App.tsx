import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useParams, useNavigate } from 'react-router-dom';
import { Music, Users, BarChart3, Award, Menu, X } from 'lucide-react';
import RehearsalDashboard from './RehearsalDashboard';
import ScoringPanel from './ScoringPanel';
import FeedbackHistory from './FeedbackHistory';
import { getPerformers, Performer } from './dataStore';
import './styles.css';

function App() {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [currentUser, setCurrentUser] = useState<Performer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerformers()
      .then((data) => {
        setPerformers(data);
        if (data.length > 0) {
          setCurrentUser(data[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Music size={24} />
            乐队排练管理
          </div>
          <div className="sidebar-subtitle">Rehearsal Manager</div>
        </div>

        <nav>
          <NavLink
            to="/"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <BarChart3 className="nav-icon" />
            曲目进度
          </NavLink>
          <NavLink
            to="/scoring"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Award className="nav-icon" />
            打分评价
          </NavLink>
          {currentUser && (
            <NavLink
              to={`/feedback/${currentUser.id}`}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Users className="nav-icon" />
              我的反馈
            </NavLink>
          )}
        </nav>

        {currentUser && (
          <div style={{ padding: '16px 24px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="performer-avatar">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{currentUser.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{currentUser.instrument}</div>
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <select
                className="form-input"
                style={{ fontSize: '12px', padding: '8px 12px' }}
                value={currentUser.id}
                onChange={(e) => {
                  const perf = performers.find((p) => p.id === e.target.value);
                  if (perf) {
                    setCurrentUser(perf);
                  }
                }}
              >
                {performers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.instrument})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <button
          className="btn btn-secondary btn-small"
          style={{ display: 'none', marginBottom: '16px' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          菜单
        </button>

        <Routes>
          <Route path="/" element={<RehearsalDashboard />} />
          <Route path="/scoring" element={<ScoringPanel />} />
          <Route path="/feedback/:id" element={<FeedbackHistoryWrapper performers={performers} />} />
        </Routes>
      </main>
    </div>
  );
}

function FeedbackHistoryWrapper({ performers }: { performers: Performer[] }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const performer = performers.find((p) => p.id === id);

  if (!performer) {
    return (
      <div className="glass-card">
        <p>未找到乐手信息</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  return <FeedbackHistory performer={performer} performers={performers} />;
}

export default App;
