import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProtocols } from '../utils/api';
import type { Protocol, FilterStatus, ProtocolStatus } from '../types';
import { relativeTime, excerpt, formatCardDate } from '../utils/markdown';

const statusLabel: Record<ProtocolStatus, string> = {
  pending: '待签',
  signed: '已签',
  completed: '已完成',
};

const filters: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待签' },
  { key: 'signed', label: '已签' },
  { key: 'completed', label: '已完成' },
];

export default function ProtocolList() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const navigate = useNavigate();

  useEffect(() => {
    getProtocols()
      .then((data) => setProtocols(data))
      .finally(() => {
        setLoading(false);
        requestAnimationFrame(() => setFadeIn(true));
      });
  }, []);

  const filtered =
    filter === 'all'
      ? protocols
      : protocols.filter((p) => p.status === filter);

  const signedCount = (p: Protocol) =>
    p.parties.filter((x) => x.signedAt !== null).length;

  const renderRingProgress = (p: Protocol) => {
    const total = p.parties.length;
    const done = signedCount(p);
    const percent = total === 0 ? 0 : (done / total) * 100;
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (percent / 100) * circumference;
    const colorVar =
      p.status === 'pending'
        ? 'var(--accent-orange)'
        : p.status === 'signed'
          ? 'var(--accent-green)'
          : 'var(--primary-blue)';

    return (
      <div className="ring-progress" title={`签署进度：${done}/${total}`}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={colorVar}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
          />
        </svg>
        <span
          className="ring-progress-text"
          style={{ color: colorVar }}
        >
          {done}/{total}
        </span>
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">协议管理中心</h1>

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== 'all'
              ? ` (${protocols.filter((p) => p.status === f.key).length})`
              : ` (${protocols.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <div style={{ marginTop: 16 }}>正在加载协议数据...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-text">
            {protocols.length === 0
              ? '暂无协议，点击上方导航栏创建您的第一份协议'
              : '当前筛选条件下没有协议'}
          </div>
          <button
            className="primary-btn"
            onClick={() => navigate('/create')}
          >
            新建协议
          </button>
        </div>
      ) : (
        <div className={`card-grid ${fadeIn ? 'card-grid--visible' : ''}`}>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="protocol-card"
              onClick={() => navigate(`/detail/${p.id}`)}
            >
              <div>
                <div className="card-header">
                  <div className="card-title" title={p.title}>
                    {p.title}
                  </div>
                  <span className={`status-tag status-${p.status}`}>
                    <span className={`status-dot status-dot-${p.status}`} />
                    {statusLabel[p.status]}
                  </span>
                </div>
                <div className="card-excerpt">
                  {excerpt(p.content, 60)}
                </div>
                <div className="card-meta">
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {signedCount(p)} / {p.parties.length} 方参与
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <span>{formatCardDate(p.createdAt)}</span>
                {renderRingProgress(p)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
