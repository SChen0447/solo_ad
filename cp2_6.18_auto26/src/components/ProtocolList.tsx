import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProtocols } from '../utils/api';
import type { Protocol, FilterStatus, ProtocolStatus } from '../types';
import { relativeTime, excerpt } from '../utils/markdown';

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
                    {statusLabel[p.status]}
                  </span>
                </div>
                <div className="card-excerpt">
                  {excerpt(p.content, 60)}
                </div>
                <div className="card-meta">
                  <div>
                    签署进度：{signedCount(p)} / {p.parties.length}
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <span>{relativeTime(p.createdAt)}</span>
                <span>查看详情 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
