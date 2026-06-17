import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

interface Plan {
  id: string;
  userId: string;
  goalName: string;
  goalDescription: string;
  dailyHours: number;
  duration: number;
  tasks: Task[];
  createdAt: string;
  progress: number;
}

export default function PlanList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/plans?userId=${token}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const overallProgress = plans.length > 0
    ? Math.round(plans.reduce((sum, p) => sum + p.progress, 0) / plans.length)
    : 0;

  let filtered = plans.filter(p =>
    p.goalName.toLowerCase().includes(search.toLowerCase())
  );

  if (sortBy === 'name') {
    filtered = [...filtered].sort((a, b) => a.goalName.localeCompare(b.goalName));
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return (
    <div>
      <div className="page-header">
        <h1>我的学习计划</h1>
        <p>管理你的学习目标，追踪每日进度</p>
      </div>
      <div className="page-body">
        <div className="progress-bar-wrapper">
          <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }} />
          <span className="progress-bar-text">{overallProgress}%</span>
        </div>

        <div className="search-sort-bar">
          <input
            className="search-input"
            type="text"
            placeholder="搜索计划名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => setSortBy('name')}>按名称</button>
          <button className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`} onClick={() => setSortBy('date')}>按时间</button>
          <button className="btn-primary" onClick={() => navigate('/create')}>+ 新建计划</button>
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-state-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg></div><p className="empty-state-text">加载中...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <p className="empty-state-text">{search ? '没有找到匹配的计划' : '还没有学习计划，点击上方按钮创建一个吧'}</p>
          </div>
        ) : (
          <div className="plan-grid">
            {filtered.map(plan => (
              <div key={plan.id} className="plan-card">
                <div className="plan-card-name">{plan.goalName}</div>
                <div className="plan-card-date">创建于 {new Date(plan.createdAt).toLocaleDateString('zh-CN')}</div>
                <div className="plan-card-progress">
                  <div className="plan-card-progress-label">
                    <span>进度</span>
                    <span>{plan.progress}%</span>
                  </div>
                  <div className="plan-card-progress-bar">
                    <div className="plan-card-progress-fill" style={{ width: `${plan.progress}%` }} />
                  </div>
                </div>
                <div className="plan-card-footer">
                  <button className="plan-card-btn" onClick={() => navigate(`/plan/${plan.id}`)}>查看详情 →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
