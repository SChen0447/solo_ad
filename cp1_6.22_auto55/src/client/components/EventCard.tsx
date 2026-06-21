import React from 'react';

interface Event {
  id: string;
  name: string;
  time: string;
  location: string;
  validUntil: string;
  signInRecords?: { phone: string }[];
}

interface EventCardProps {
  event: Event;
  onShowQR: () => void;
  onSignIn: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onShowQR, onSignIn }) => {
  const isExpired = new Date() > new Date(event.validUntil);
  const signInCount = event.signInRecords?.length || 0;

  return (
    <div
      className="card glass"
      style={{
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{event.name}</h3>
      <div className="info-row">
        <span className="info-label">时间:</span>
        <span className="info-value">{new Date(event.time).toLocaleString('zh-CN')}</span>
      </div>
      <div className="info-row">
        <span className="info-label">地点:</span>
        <span className="info-value">{event.location}</span>
      </div>
      <div className="info-row">
        <span className="info-label">状态:</span>
        <span className="info-value" style={{ color: isExpired ? '#fc8181' : '#48bb78' }}>
          {isExpired ? '已结束' : '进行中'}
        </span>
      </div>
      <div className="info-row">
        <span className="info-label">签到:</span>
        <span className="info-value">{signInCount} 人</span>
      </div>
      <div className="header-actions" style={{ marginTop: 16 }}>
        <button className="btn" onClick={onShowQR}>
          二维码
        </button>
        <button
          className="btn btn-secondary"
          onClick={onSignIn}
          disabled={isExpired}
        >
          {isExpired ? '已结束' : '去签到'}
        </button>
      </div>
    </div>
  );
};

export default EventCard;
