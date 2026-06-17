import { useState, useEffect } from 'react';
import VotingPanel from './components/VotingPanel';
import Dashboard from './components/Dashboard';
import ReportPage from './components/ReportPage';
import { createActivity, getActivityByCode } from './services';

type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'join' }
  | { name: 'vote'; activityId: string }
  | { name: 'dashboard'; activityId: string }
  | { name: 'report'; activityId: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  if (parts.length >= 2) {
    if (parts[0] === 'vote') return { name: 'vote', activityId: parts[1] };
    if (parts[0] === 'dashboard') return { name: 'dashboard', activityId: parts[1] };
    if (parts[0] === 'report') return { name: 'report', activityId: parts[1] };
  }
  if (parts[0] === 'create') return { name: 'create' };
  if (parts[0] === 'join') return { name: 'join' };
  return { name: 'home' };
}

function navigate(route: Route) {
  let hash = '';
  if (route.name === 'vote') hash = `#/vote/${route.activityId}`;
  else if (route.name === 'dashboard') hash = `#/dashboard/${route.activityId}`;
  else if (route.name === 'report') hash = `#/report/${route.activityId}`;
  else if (route.name === 'create') hash = '#/create';
  else if (route.name === 'join') hash = '#/join';
  else hash = '#/';
  window.location.hash = hash;
}

function HomePage() {
  return (
    <div className="card home-page">
      <h2>实时投票与情感分析系统</h2>
      <p style={{ color: '#666', marginBottom: 32 }}>
        让每一次活动都能即时获取观众反馈
      </p>
      <div className="home-actions">
        <button className="btn btn-primary" onClick={() => navigate({ name: 'create' })}>
          创建新活动
        </button>
        <button className="btn btn-secondary" onClick={() => navigate({ name: 'join' })}>
          输入邀请码参与
        </button>
      </div>
    </div>
  );
}

function CreateActivityPage() {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('对开场演讲的满意度');
  const [expected, setExpected] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !topic.trim()) {
      setError('请填写活动名称和话题');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createActivity(name.trim(), topic.trim(), expected);
      navigate({ name: 'dashboard', activityId: result.activity_id });
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: '#2C3E50' }}>创建新活动</h2>
      {error && <p style={{ color: '#E74C3C' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>活动名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：2026年度产品发布会"
          />
        </div>
        <div className="form-group">
          <label>当前话题</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：对开场演讲的满意度"
          />
        </div>
        <div className="form-group">
          <label>预计参与人数</label>
          <input
            type="number"
            value={expected}
            onChange={(e) => setExpected(parseInt(e.target.value) || 100)}
            min={1}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '创建中...' : '创建活动'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate({ name: 'home' })}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

function JoinActivityPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.trim().length !== 6) {
      setError('请输入6位邀请码');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getActivityByCode(code.trim());
      navigate({ name: 'vote', activityId: result.activity_id });
    } catch (e: any) {
      setError('邀请码无效或活动不存在');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: '#2C3E50' }}>参与投票</h2>
      {error && <p style={{ color: '#E74C3C' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>输入邀请码</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6位数字邀请码"
            maxLength={6}
            style={{ letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 600 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '验证中...' : '进入投票'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate({ name: 'home' })}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const isReportPage = route.name === 'report';

  const renderContent = () => {
    if (route.name === 'home') return <HomePage />;
    if (route.name === 'create') return <CreateActivityPage />;
    if (route.name === 'join') return <JoinActivityPage />;
    if (route.name === 'vote') return <VotingPanel activityId={route.activityId} />;
    if (route.name === 'dashboard')
      return (
        <Dashboard
          activityId={route.activityId}
          onEndActivity={() => navigate({ name: 'report', activityId: route.activityId })}
        />
      );
    if (route.name === 'report') return <ReportPage activityId={route.activityId} />;
    return null;
  };

  if (isReportPage) {
    return <div className="app-container">{renderContent()}</div>;
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1 onClick={() => navigate({ name: 'home' })} style={{ cursor: 'pointer' }}>
          🎯 实时投票系统
        </h1>
        <div className="nav-links">
          <a href="#/">首页</a>
          <a href="#/create">创建活动</a>
          <a href="#/join">参与投票</a>
        </div>
      </nav>
      <div className="main-content">{renderContent()}</div>
    </div>
  );
}
