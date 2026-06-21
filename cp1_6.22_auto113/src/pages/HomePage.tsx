import React, { useState, useEffect } from 'react';
import DriftCard from '../components/DriftCard';
import type { Item } from '../backend/types';

interface HomePageProps {
  userId: string;
}

const HomePage: React.FC<HomePageProps> = ({ userId }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        setItems(data.items);
      } catch (error) {
        console.error('获取物品列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleLikeChange = (itemId: string, liked: boolean, likes: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              likes,
              likedBy: liked
                ? [...item.likedBy, userId]
                : item.likedBy.filter((id) => id !== userId),
            }
          : item
      )
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" style={{ borderTopColor: '#f97316' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">漂流瓶广场</h1>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍾</div>
          <p>暂无漂流瓶，快来发布第一个吧！</p>
        </div>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <DriftCard
              key={item.id}
              item={item}
              userId={userId}
              onLikeChange={handleLikeChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
