import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

interface DishCardProps {
  dish: Dish;
  gradient: [string, string];
  ratings: Rating[];
  onRatingSubmit: (dishId: string, score: number) => void;
}

function getDailyAverage(ratings: Rating[]) {
  const now = new Date();
  const dailyMap: Record<string, { total: number; count: number }> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyMap[key] = { total: 0, count: 0 };
  }

  for (const r of ratings) {
    const d = new Date(r.createdAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 6) {
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dailyMap[key]) {
        dailyMap[key].total += r.score;
        dailyMap[key].count += 1;
      }
    }
  }

  return Object.entries(dailyMap).map(([date, { total, count }]) => ({
    date,
    score: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
  }));
}

export default function DishCard({ dish, gradient, ratings, onRatingSubmit }: DishCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [animatingStar, setAnimatingStar] = useState(0);

  const chartData = useMemo(() => getDailyAverage(ratings), [ratings]);

  const handleStarClick = (score: number) => {
    setSelectedRating(score);
    setAnimatingStar(score);
    onRatingSubmit(dish.id, score);
    setTimeout(() => setAnimatingStar(0), 150);
  };

  const gradientId = `grad-${dish.id}`;
  const borderColor = gradient[0];

  return (
    <div
      style={{
        width: '200px',
        height: '280px',
        perspective: '800px',
        flexShrink: 0,
      }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transition: 'transform 0.6s',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            background: '#fff',
            border: `2px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px',
          }}
        >
          <span style={{ fontSize: '56px', lineHeight: 1 }}>{dish.emoji}</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748', textAlign: 'center' }}>
            {dish.name}
          </span>
          <div
            style={{ fontSize: '12px', color: '#a0aec0' }}
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  cursor: 'pointer',
                  fontSize: '20px',
                  color:
                    star <= (hoverRating || selectedRating)
                      ? '#f6e05e'
                      : '#cbd5e0',
                  transition: 'transform 0.15s ease',
                  transform: star === animatingStar ? 'scale(1.3)' : 'scale(1)',
                  display: 'inline-block',
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            background: '#fff',
            border: `2px solid ${borderColor}`,
            transform: 'rotateY(180deg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>
            {dish.name} - 近一周评分
          </div>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={gradient[0]} />
                    <stop offset="100%" stopColor={gradient[1]} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#a0aec0' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10, fill: '#a0aec0' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  width={25}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={2}
                  dot={{ r: 2, fill: gradient[0], stroke: gradient[0], strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: gradient[0], stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
