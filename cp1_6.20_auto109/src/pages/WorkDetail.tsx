import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Work } from '../types';
import { getWork } from '../services/works';

const WorkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const fetchWork = async () => {
      try {
        const response = await getWork(parseInt(id));
        setWork(response.work);
      } catch (err: any) {
        setError(err.response?.data?.message || '加载作品失败');
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id]);

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="main-content">
        <div className="loading" style={{ color: 'var(--color-error)' }}>
          {error || '作品不存在'}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="work-detail">
        <img
          src={work.image_path}
          alt={work.title}
          className="work-detail-image"
        />
        <h1 className="work-detail-title">{work.title}</h1>
        <div className="work-detail-meta">
          <span>作者：@{work.author.username}</span>
          <span>上传时间：{new Date(work.created_at).toLocaleString('zh-CN')}</span>
        </div>
        <div className="work-detail-description">
          {work.description || '暂无创作说明'}
        </div>

        {user?.is_judge && (
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate(`/score/${work.id}`)}
          >
            为该作品打分
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkDetail;
