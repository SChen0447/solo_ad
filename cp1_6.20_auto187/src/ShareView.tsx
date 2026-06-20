import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PlanBookData } from './types';
import { getShareData } from './api/apiService';
import PlanBook from './modules/planGenerator/PlanBook';

const ShareView: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [data, setData] = useState<PlanBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uuid) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }
    getShareData(uuid)
      .then(setData)
      .catch(() => setError('该分享链接不存在或已过期'))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ pointerEvents: 'none' }}>
      <PlanBook data={data} />
    </div>
  );
};

export default ShareView;
