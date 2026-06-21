import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EnvelopeCard from '../components/EnvelopeCard';

interface WishlistItem {
  id: string;
  itemName: string;
  description: string | null;
  preference: string | null;
}

interface AssignmentData {
  receiver: {
    id: string;
    nickname: string;
    address: string | null;
  };
  wishlist: WishlistItem[];
  room: {
    name: string;
    exchangeDeadline: string;
  };
  giftSent: boolean;
}

const Assignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/assignment/${id}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('网络错误');
        setLoading(false);
      });
  }, [id]);

  const handleGiftSent = async () => {
    if (!id) return;
    try {
      await fetch(`/api/gift/sent/${id}`, { method: 'PATCH' });
      setData((prev) => (prev ? { ...prev, giftSent: true } : prev));
    } catch (err) {
      setError('操作失败');
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error || !data) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 40 }}>
        <div className="error-message" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
          {error || '未找到匹配信息'}
        </div>
        <Link to={id ? `/participant/${id}` : '/'} className="btn btn-primary">
          返回
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to={id ? `/participant/${id}` : '/'} className="back-link">
        ← 返回仪表盘
      </Link>

      <div className="page-header">
        <h1 className="page-title">🎁 你抽中的人是...</h1>
        <p className="page-subtitle">{data.room.name}</p>
      </div>

      <EnvelopeCard
        receiverName={data.receiver.nickname}
        wishlist={data.wishlist}
        address={data.receiver.address}
        giftSent={data.giftSent}
        onGiftSent={handleGiftSent}
      />

      <div style={{ textAlign: 'center', marginTop: 16, color: '#718096', fontSize: 14 }}>
        请在 {new Date(data.room.exchangeDeadline).toLocaleDateString('zh-CN')} 前寄出礼物
      </div>
    </div>
  );
};

export default Assignment;
