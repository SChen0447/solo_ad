import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PendingWork } from '../types';
import { getPendingWorks } from '../services/scores';

const Judge: React.FC = () => {
  const [works, setWorks] = useState<PendingWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user?.is_judge) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.is_judge) return;

    const fetchWorks = async () => {
      try {
        const response = await getPendingWorks();
        setWorks(response.works);
      } catch (err: any) {
        setError(err.response?.data?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, [user?.is_judge]);

  if (authLoading || loading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!user?.is_judge) {
    return null;
  }

  return (
    <div className="main-content">
      <h1 className="page-title">评委打分</h1>
      {error && (
        <div className="loading" style={{ color: 'var(--color-error)' }}>
          {error}
        </div>
      )}
      {works.length === 0 ? (
        <div className="loading">暂无待评分作品</div>
      ) : (
        <div className="pending-list">
          {works.map((work) => (
            <div key={work.id} className="pending-item">
              <img src={work.thumbnail_path} alt={work.title} />
              <div className="pending-info">
                <h3>{work.title}</h3>
                <p className="date">
                  上传时间：{new Date(work.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <span
                  className={`status-badge ${work.is_scored ? 'status-done' : 'status-pending'}`}
                >
                  {work.is_scored ? '已打分' : '待打分'}
                </span>
                {!work.is_scored && (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/score/${work.id}`)}
                  >
                    去打分
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Judge;
