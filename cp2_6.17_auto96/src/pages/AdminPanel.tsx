import { useEffect, useState } from 'react';
import type { Stage } from '../types';
import '../styles/AdminPanel.css';

interface AdminPanelProps {
  onStageChange?: () => void;
}

const AdminPanel = ({ onStageChange }: AdminPanelProps) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const res = await fetch('/api/stages');
      const data = await res.json();
      setStages(data);
    } catch (err) {
      console.error('获取舞台列表失败:', err);
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !startTime) {
      setMessage('请填写舞台名称和起始时间');
      return;
    }

    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, startTime }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('舞台创建成功');
        setName('');
        setDescription('');
        setStartTime('');
        fetchStages();
        onStageChange?.();
      } else {
        setMessage(data.error || '创建失败');
      }
    } catch (err) {
      setMessage('网络错误');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/stages/${id}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchStages();
        onStageChange?.();
      }
    } catch (err) {
      console.error('切换状态失败:', err);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-card">
        <h2 className="admin-title">📊 舞台总览</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>舞台名称</th>
                <th>舞台编号</th>
                <th>当前平均分</th>
                <th>投票人数</th>
                <th>最高分</th>
                <th>开始时间</th>
                <th>投票状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row">
                    暂无舞台数据
                  </td>
                </tr>
              ) : (
                stages.map((stage) => (
                  <tr key={stage.id}>
                    <td>{stage.name}</td>
                    <td>{stage.code}</td>
                    <td>{stage.average.toFixed(1)}</td>
                    <td>{stage.count}</td>
                    <td>{stage.max}</td>
                    <td>{stage.startTime}</td>
                    <td>
                      <span className={`status-badge ${stage.votingEnabled ? 'active' : 'inactive'}`}>
                        {stage.votingEnabled ? '开启' : '关闭'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`toggle-btn ${stage.votingEnabled ? 'on' : 'off'}`}
                        onClick={() => handleToggle(stage.id)}
                      >
                        {stage.votingEnabled ? '开启' : '关闭'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-title">➕ 创建舞台</h2>
        <form onSubmit={handleCreateStage} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>舞台名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入舞台名称"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>起始时间</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="如 14:00"
                className="form-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="舞台描述（可选）"
              className="form-textarea"
              rows={3}
            />
          </div>
          {message && (
            <div className={`form-message ${message.includes('成功') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          <button type="submit" className="submit-btn admin-submit">
            创建舞台
          </button>
          <p className="stage-count-hint">已创建 {stages.length}/10 个舞台</p>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;
