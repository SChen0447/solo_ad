import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RoomCard from '../components/RoomCard';

interface Room {
  id: string;
  roomCode: string;
  name: string;
  eventDate: string;
  exchangeDeadline: string;
  status: 'pending' | 'active' | 'completed';
  participants: { id: string }[];
  stats: { total: number };
}

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/rooms')
      .then((r) => r.json())
      .then((data) => {
        setRooms(data.rooms || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/join/${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">🎅 Secret Santa 礼物交换</h1>
        <p className="page-subtitle">发起或参与一场神秘的礼物交换活动</p>
      </div>

      <div className="home-actions">
        <Link to="/create" className="btn btn-primary">
          ✨ 创建新活动
        </Link>
        <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="form-input"
            placeholder="输入房间码"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            style={{ width: 180, background: 'white', borderRadius: 8 }}
          />
          <button type="submit" className="btn btn-gold">
            加入活动
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎁</div>
          <div className="empty-state-text">还没有活动，快来创建第一个吧！</div>
          <Link to="/create" className="btn btn-primary">
            创建新活动
          </Link>
        </div>
      ) : (
        <div className="room-cards">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              eventDate={room.eventDate}
              exchangeDeadline={room.exchangeDeadline}
              status={room.status}
              participantCount={room.stats?.total || 0}
              onClick={() => navigate(`/join/${room.roomCode}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
