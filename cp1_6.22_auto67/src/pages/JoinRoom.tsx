import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface WishlistInput {
  itemName: string;
  description: string;
  preference: string;
}

const JoinRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [wishlist, setWishlist] = useState<WishlistInput[]>([
    { itemName: '', description: '', preference: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    eventDate: string;
    exchangeDeadline: string;
    minPrice: number;
    maxPrice: number;
    participantCount: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (roomCode) {
      fetch(`/api/room/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, nickname: '__temp__' }),
      }).catch(() => {});

      fetch('/api/rooms')
        .then((r) => r.json())
        .then((data) => {
          const room = (data.rooms || []).find(
            (r: { roomCode: string }) => r.roomCode === roomCode
          );
          if (room) {
            setRoomInfo({
              name: room.name,
              eventDate: room.eventDate,
              exchangeDeadline: room.exchangeDeadline,
              minPrice: room.minPrice,
              maxPrice: room.maxPrice,
              participantCount: room.stats?.total || 0,
              status: room.status,
            });
          }
        });
    }
  }, [roomCode]);

  const addWishlistItem = () => {
    if (wishlist.length < 3) {
      setWishlist([...wishlist, { itemName: '', description: '', preference: '' }]);
    }
  };

  const updateWishlistItem = (index: number, field: keyof WishlistInput, value: string) => {
    const updated = [...wishlist];
    updated[index] = { ...updated[index], [field]: value };
    setWishlist(updated);
  };

  const removeWishlistItem = (index: number) => {
    if (wishlist.length > 1) {
      setWishlist(wishlist.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('请输入您的昵称');
      return;
    }

    const validWishlist = wishlist
      .filter((w) => w.itemName.trim())
      .map((w) => ({
        itemName: w.itemName.trim(),
        description: w.description.trim() || undefined,
        preference: w.preference.trim() || undefined,
      }));

    setLoading(true);
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          nickname: nickname.trim(),
          address: address.trim() || null,
          email: email.trim() || null,
          wishlist: validWishlist,
        }),
      });
      const data = await res.json();
      if (data.participant) {
        navigate(`/participant/${data.participant.id}`);
      } else {
        setError(data.error || '加入失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="page-header">
        <h1 className="page-title">加入活动</h1>
        {roomInfo && (
          <p className="page-subtitle">
            房间码: <strong style={{ color: '#d69e2e' }}>{roomCode}</strong>
          </p>
        )}
      </div>

      {roomInfo && (
        <div className="stats-card" style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#9b2c2c', marginBottom: 12 }}>{roomInfo.name}</h3>
          <div style={{ fontSize: 14, color: '#718096', display: 'grid', gap: 6 }}>
            <div>活动时间: {new Date(roomInfo.eventDate).toLocaleDateString('zh-CN')}</div>
            <div>最晚交换: {new Date(roomInfo.exchangeDeadline).toLocaleDateString('zh-CN')}</div>
            <div>
              价格区间: {roomInfo.minPrice} - {roomInfo.maxPrice} 元
            </div>
            <div>当前参与人数: {roomInfo.participantCount} 人</div>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="form-group">
          <label className="form-label">昵称 *</label>
          <input
            type="text"
            className="form-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入您的昵称"
            maxLength={20}
          />
        </div>

        <div className="form-group">
          <label className="form-label">收货地址（可选，仅送礼人可见）</label>
          <textarea
            className="form-input textarea"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="请输入您的收货地址，方便对方寄送礼物"
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label className="form-label">邮箱（可选，用于接收提醒邮件）</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">我的心愿清单（最多3项）</label>
          {wishlist.map((item, index) => (
            <div key={index} className="wishlist-input-group">
              <span className="wishlist-number">心愿 {index + 1}</span>
              <div className="form-group" style={{ marginTop: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  value={item.itemName}
                  onChange={(e) => updateWishlistItem(index, 'itemName', e.target.value)}
                  placeholder="礼物名称（如：蓝牙音箱）"
                  maxLength={30}
                />
              </div>
              <div className="form-group">
                <textarea
                  className="form-input textarea"
                  value={item.description}
                  onChange={(e) => updateWishlistItem(index, 'description', e.target.value)}
                  placeholder="描述（100字以内）"
                  maxLength={100}
                  style={{ minHeight: 60 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  className="form-input"
                  value={item.preference}
                  onChange={(e) => updateWishlistItem(index, 'preference', e.target.value)}
                  placeholder="品牌/颜色偏好（可选）"
                  maxLength={50}
                />
              </div>
              {wishlist.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWishlistItem(index)}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    color: '#9b2c2c',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  移除此项
                </button>
              )}
            </div>
          ))}
          {wishlist.length < 3 && (
            <button type="button" className="add-wishlist-btn" onClick={addWishlistItem}>
              + 添加心愿
            </button>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? '加入中...' : '🎉 加入活动'}
        </button>
      </form>
    </div>
  );
};

export default JoinRoom;
