import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DishCard from '../components/DishCard';

interface Restaurant {
  id: string;
  name: string;
  gradient: [string, string];
  topDishes: string[];
}

interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  emoji: string;
}

interface Rating {
  id: string;
  dishId: string;
  score: number;
  createdAt: string;
}

interface Recommendation {
  dishId: string;
  dishName: string;
  emoji: string;
  score: number;
}

function getTagColor(score: number): string {
  if (score >= 4.5) return '#48bb78';
  if (score >= 3.5) return '#ecc94b';
  return '#a0aec0';
}

export default function DishListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, Rating[]>>({});
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch('/api/restaurants').then((r) => r.json()),
      fetch(`/api/restaurants/${id}/dishes`).then((r) => r.json()),
    ]).then(([restaurantsData, dishesData]) => {
      const rest = restaurantsData.find((r: Restaurant) => r.id === id);
      setRestaurant(rest || null);
      setDishes(dishesData);

      Promise.all(
        dishesData.map((d: Dish) =>
          fetch(`/api/dishes/${d.id}/ratings`)
            .then((r) => r.json())
            .then((ratings) => ({ dishId: d.id, ratings }))
        )
      ).then((results) => {
        const map: Record<string, Rating[]> = {};
        for (const r of results) {
          map[r.dishId] = r.ratings;
        }
        setRatingsMap(map);
        setLoading(false);
      });
    });
  }, [id]);

  const handleRatingSubmit = useCallback(
    async (dishId: string, score: number) => {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId, score }),
      });

      const res = await fetch(`/api/dishes/${dishId}/ratings`);
      const updatedRatings = await res.json();
      setRatingsMap((prev) => ({ ...prev, [dishId]: updatedRatings }));
    },
    []
  );

  const handleRecommend = async () => {
    if (!id) return;
    const res = await fetch(`/api/recommendations/${id}`);
    const data = await res.json();
    setRecommendations(data);
    setShowModal(true);
  };

  if (loading || !restaurant) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0', fontSize: '16px' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#718096',
              padding: 0,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2d3748')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#718096')}
          >
            ← 返回
          </button>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#2d3748',
              background: `linear-gradient(135deg, ${restaurant.gradient[0]}, ${restaurant.gradient[1]})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {restaurant.name}
          </h2>
        </div>
        <button
          onClick={handleRecommend}
          style={{
            background: `linear-gradient(135deg, ${restaurant.gradient[0]}, ${restaurant.gradient[1]})`,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 24px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: `0 2px 8px ${restaurant.gradient[0]}44`,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = `0 4px 16px ${restaurant.gradient[0]}66`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `0 2px 8px ${restaurant.gradient[0]}44`;
          }}
        >
          🤖 智能推荐
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '24px',
          overflowX: 'auto',
          paddingBottom: '16px',
          scrollBehavior: 'smooth',
        }}
      >
        {dishes.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            gradient={restaurant.gradient}
            ratings={ratingsMap[dish.id] || []}
            onRatingSubmit={handleRatingSubmit}
          />
        ))}
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', color: '#a0aec0' }}>
        💡 点击卡片可翻转查看评分趋势，星星可提交评分
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '20px',
              padding: '32px',
              minWidth: '360px',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748', margin: 0 }}>
                🤖 智能推荐
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#a0aec0',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2d3748')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a0aec0')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.dishId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div
                    style={{
                      width: '4px',
                      height: '100%',
                      minHeight: '48px',
                      background: getTagColor(rec.score),
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#a0aec0',
                          width: '24px',
                          textAlign: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '24px' }}>{rec.emoji}</span>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#2d3748' }}>
                        {rec.dishName}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: getTagColor(rec.score),
                      }}
                    >
                      {rec.score.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
