import React, { useState, useEffect } from 'react';
import { Work } from '../types';
import { getWorks } from '../services/works';
import WorkCard from '../components/WorkCard';

const Home: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const response = await getWorks(1, 50);
        setWorks(response.works);
      } catch (err: any) {
        setError(err.response?.data?.message || '加载作品失败');
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="loading" style={{ color: 'var(--color-error)' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1 className="page-title">参赛作品</h1>
      {works.length === 0 ? (
        <div className="loading">暂无作品，快来上传第一个作品吧！</div>
      ) : (
        <div className="work-grid">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
