import { useNavigate } from 'react-router-dom';

interface RestaurantCardProps {
  id: string;
  name: string;
  gradient: [string, string];
  topDishes: string[];
}

export default function RestaurantCard({ id, name, gradient, topDishes }: RestaurantCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/restaurant/${id}`)}
      style={{
        width: '280px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}
    >
      <div
        style={{
          height: '100px',
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '22px',
          fontWeight: 700,
          textShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        {name}
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '13px', color: '#718096', marginBottom: '10px' }}>好评推荐</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {topDishes.map((dish) => (
            <span
              key={dish}
              style={{
                fontSize: '14px',
                color: '#2d3748',
                fontWeight: 700,
              }}
            >
              {dish}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
