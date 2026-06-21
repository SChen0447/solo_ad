import { useNavigate } from 'react-router-dom';

interface Travel {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  summary: string;
  created_at: string;
}

interface TravelCardProps {
  travel: Travel;
  index: number;
}

export default function TravelCard({ travel, index }: TravelCardProps) {
  const navigate = useNavigate();

  const days = (() => {
    const start = new Date(travel.start_date);
    const end = new Date(travel.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  })();

  return (
    <div
      onClick={() => navigate(`/travel/${travel.id}`)}
      style={{
        width: '280px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #2b6cb0, #805ad5)',
        color: 'white',
        padding: '24px',
        cursor: 'pointer',
        boxShadow: 'rgba(0,0,0,0.15) 0px 4px 12px',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        animation: `cardSlideIn 0.4s ease-out ${index * 0.1}s both`,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.2) 0px 12px 24px';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.15) 0px 4px 12px';
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-20px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: 700,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {travel.name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px' }}>📍</span>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>{travel.city}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '2px' }}>日期</div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>
              {travel.start_date} ~ {travel.end_date}
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {days}天
          </div>
        </div>

        {travel.summary && (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '13px',
            opacity: 0.85,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-line',
          }}>
            {travel.summary}
          </p>
        )}
      </div>

      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
