import { useEffect, useState } from 'react';
import RestaurantCard from '../components/RestaurantCard';

interface Restaurant {
  id: string;
  name: string;
  gradient: [string, string];
  topDishes: string[];
}

export default function RestaurantListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/restaurants')
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0', fontSize: '16px' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#2d3748', marginBottom: '24px' }}>
        🏫 食堂窗口
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 280px)',
          gap: '24px',
          justifyContent: 'start',
        }}
      >
        {restaurants.map((r) => (
          <RestaurantCard
            key={r.id}
            id={r.id}
            name={r.name}
            gradient={r.gradient}
            topDishes={r.topDishes}
          />
        ))}
      </div>
    </div>
  );
}
