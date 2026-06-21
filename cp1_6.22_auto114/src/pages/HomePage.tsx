import React, { useState, useEffect } from 'react';
import { Work } from '../types';
import { fetchWorks } from '../api/works';
import WorkCard from '../components/WorkCard';
import { WorkListSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';

const HomePage: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const loadWorks = async () => {
      try {
        setLoading(true);
        const data = await fetchWorks();
        setWorks(data);
      } catch (error) {
        showToast('加载作品失败，请稍后重试', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadWorks();
  }, [showToast]);

  return (
    <div className="main-content">
      <div className="container">
        <h1 className="page-title">发现匠心之作</h1>
        {loading ? (
          <WorkListSkeleton />
        ) : (
          <div className="works-grid">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
        {!loading && works.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎨</div>
            <p>暂无作品</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
