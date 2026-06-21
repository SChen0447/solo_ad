import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface CreateForm {
  name: string;
  eventDate: string;
  minPrice: number;
  maxPrice: number;
  exchangeDeadline: string;
}

const CreateRoom: React.FC = () => {
  const [form, setForm] = useState<CreateForm>({
    name: '',
    eventDate: '',
    minPrice: 50,
    maxPrice: 200,
    exchangeDeadline: '',
  });
  const [createdRoom, setCreatedRoom] = useState<{ roomCode: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'minPrice' || name === 'maxPrice' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.name.trim()) {
      setError('请输入活动名称');
      setLoading(false);
      return;
    }
    if (!form.eventDate) {
      setError('请选择活动时间');
      setLoading(false);
      return;
    }
    if (!form.exchangeDeadline) {
      setError('请选择最晚交换日期');
      setLoading(false);
      return;
    }
    if (form.minPrice > form.maxPrice) {
      setError('最低价格不能高于最高价格');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          exclusionPairs: [],
        }),
      });
      const data = await res.json();
      if (data.room) {
        setCreatedRoom({ roomCode: data.room.roomCode, id: data.room.id });
      } else {
        setError(data.error || '创建失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (createdRoom) {
    return (
      <div className="create-page">
        <div className="create-card" style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#48bb78' }}>🎉 活动创建成功！</h1>
          <p className="subtitle">分享以下房间码给朋友们加入活动</p>
          <div className="room-code-display">
            <div className="room-code-label">活动房间码</div>
            <div className="room-code-value">{createdRoom.roomCode}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn-gold btn-block"
              onClick={() => navigate(`/join/${createdRoom.roomCode}`)}
            >
              立即加入活动
            </button>
            <Link to="/" className="btn btn-primary btn-block" style={{ boxSizing: 'border-box' }}>
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-page">
      <div className="create-card">
        <Link to="/" className="back-link">← 返回首页</Link>
        <h1>创建礼物交换活动</h1>
        <p className="subtitle">设置活动信息，和朋友们一起享受惊喜</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">活动名称 *</label>
            <input
              type="text"
              className="form-input"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="例如：极客组圣诞交换"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">活动时间 *</label>
            <input
              type="date"
              className="form-input"
              name="eventDate"
              value={form.eventDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">礼物价格区间（元）</label>
            <div className="price-range">
              <input
                type="number"
                className="form-input"
                name="minPrice"
                value={form.minPrice}
                onChange={handleChange}
                min={0}
                step={10}
                placeholder="最低价"
              />
              <span style={{ color: '#718096' }}>—</span>
              <input
                type="number"
                className="form-input"
                name="maxPrice"
                value={form.maxPrice}
                onChange={handleChange}
                min={0}
                step={10}
                placeholder="最高价"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">最晚交换日期 *</label>
            <input
              type="date"
              className="form-input"
              name="exchangeDeadline"
              value={form.exchangeDeadline}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? '创建中...' : '✨ 创建活动'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;
