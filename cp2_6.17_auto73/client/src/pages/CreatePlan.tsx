import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreatePlan() {
  const navigate = useNavigate();
  const [goalName, setGoalName] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [dailyHours, setDailyHours] = useState(2);
  const [duration, setDuration] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalName, goalDescription, dailyHours, duration, userId: token }),
      });
      if (!res.ok) { setError('创建失败'); return; }
      const plan = await res.json();
      navigate(`/plan/${plan.id}`);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>创建学习计划</h1>
        <p>设定目标，自动生成每日任务</p>
      </div>
      <div className="page-body">
        <form className="create-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label>学习目标名称</label>
            <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="例如：掌握React开发" required />
          </div>
          <div className="form-group">
            <label>目标描述</label>
            <textarea value={goalDescription} onChange={e => setGoalDescription(e.target.value)} placeholder="描述你的学习目标和期望达成的成果" required />
          </div>
          <div className="slider-group">
            <label>每日可用学习时长 <span className="slider-value">{dailyHours}小时</span></label>
            <input type="range" min="1" max="8" value={dailyHours} onChange={e => setDailyHours(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>计划周期</label>
            <div className="duration-options">
              {([7, 14, 30] as const).map(d => (
                <div key={d} className={`duration-option ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>
                  {d}天
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? '生成中...' : '生成学习计划'}</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/')}>取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
