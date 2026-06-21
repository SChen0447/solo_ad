import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface Participant {
  id: string;
  nickname: string;
  giftSent: number;
  giftReceived: number;
}

interface Room {
  id: string;
  name: string;
  eventDate: string;
  exchangeDeadline: string;
  minPrice: number;
  maxPrice: number;
  status: 'pending' | 'active' | 'completed';
  roomCode: string;
}

interface WishlistItem {
  id: string;
  itemName: string;
  description: string | null;
  preference: string | null;
}

interface Stats {
  total: number;
  sent: number;
  received: number;
}

const ParticipantDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState('');
  const [showShake, setShowShake] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/participant/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setParticipant(data.participant);
        setRoom(data.room);
        setWishlist(data.wishlist || []);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (id) {
      fetch(`/api/participant/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.room) {
            fetch(`/api/room/${data.room.id}/participants`)
              .then((r) => r.json())
              .then((d) => {
                setParticipants(d.participants || []);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [id]);

  const handleMatching = async () => {
    if (!room) return;
    setError('');
    setMatching(true);
    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/assignment/${id}`);
      } else {
        setError(data.error || '匹配失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setMatching(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!id) return;
    setShowShake(true);
    setTimeout(() => setShowShake(false), 400);
    try {
      await fetch(`/api/gift/received/${id}`, { method: 'PATCH' });
      const res = await fetch(`/api/participant/${id}`);
      const data = await res.json();
      setParticipant(data.participant);
      setStats(data.stats);
    } catch (err) {
      setError('操作失败');
    }
  };

  const handleSendReminderEmails = async () => {
    if (!room || !participants.length) return;
    participants.forEach((p) => {
      console.log(`[模拟邮件] 提醒 ${p.nickname} 准备礼物，最晚寄出日期: ${room.exchangeDeadline}`);
    });
    alert('提醒邮件已发送！（查看控制台）');
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!participant || !room) {
    return (
      <div className="container">
        <div className="error-message">未找到参与者信息</div>
        <Link to="/" className="back-link">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="page-header">
        <h1 className="page-title">你好，{participant.nickname}！ 🎅</h1>
        <p className="page-subtitle">{room.name}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-card">
        <h3 style={{ color: '#9b2c2c', marginBottom: 16, textAlign: 'center' }}>
          活动状态
        </h3>
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-value">{stats?.total || 0}</div>
            <div className="stat-label">总人数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats?.sent || 0}</div>
            <div className="stat-label">已送出</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats?.received || 0}</div>
            <div className="stat-label">已收到</div>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 14, color: '#718096', marginBottom: 8 }}>
            参与成员:
          </div>
          <div className="participants-list">
            {participants.map((p) => (
              <span key={p.id} className="participant-tag">
                {p.nickname}
                {p.giftSent === 1 && ' ✓'}
                {p.giftReceived === 1 && ' 🎁'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {wishlist.length > 0 && (
        <div className="stats-card">
          <h3 style={{ color: '#d69e2e', marginBottom: 16 }}>我的心愿清单</h3>
          {wishlist.map((item, idx) => (
            <div key={item.id} className="wishlist-item">
              <span className="star-icon">★</span>
              <div className="wishlist-content">
                <div className="wishlist-name">
                  {idx + 1}. {item.itemName}
                </div>
                {item.description && <div className="wishlist-desc">{item.description}</div>}
                {item.preference && (
                  <div className="wishlist-pref">偏好: {item.preference}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="action-buttons">
        {room.status === 'pending' && (
          <button
            className="btn btn-primary btn-block"
            onClick={handleMatching}
            disabled={matching || (stats?.total || 0) < 2}
          >
            {matching ? '匹配中...' : '🎲 开始随机匹配'}
          </button>
        )}

        {room.status !== 'pending' && (
          <button
            className="btn btn-gold btn-block"
            onClick={() => navigate(`/assignment/${id}`)}
          >
            🎁 查看我抽中的人
          </button>
        )}

        <button
          className={`btn btn-block ${participant.giftReceived === 1 ? 'btn-success' : 'btn-primary'} ${showShake ? 'shake-animation' : ''}`}
          onClick={handleMarkReceived}
          disabled={participant.giftReceived === 1}
        >
          {participant.giftReceived === 1 ? '✓ 感谢卡已发送' : '📬 我已收到礼物'}
        </button>
      </div>

      {room.status === 'active' && (
        <button
          className="btn btn-block"
          style={{ marginTop: 16, background: 'rgba(155,44,44,0.1)', color: '#9b2c2c' }}
          onClick={handleSendReminderEmails}
        >
          📧 发送活动提醒（模拟邮件）
        </button>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#718096' }}>
          活动房间码: <strong style={{ color: '#d69e2e', fontSize: 16 }}>{room.roomCode}</strong>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;
