import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import ItemCard from '../components/ItemCard';

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  desiredTags: string[];
  ownerId: string;
  ownerNickname: string;
  ownerCreditScore: number;
  createdAt: string;
}

const DEFAULT_USER_ID = 'user1';

const MyFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${DEFAULT_USER_ID}/favorites`);
      const result = await res.json();
      if (result.success) {
        setFavorites(result.data);
      }
    } catch (err) {
      console.error('获取收藏列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleToggleFavorite = async (itemId: string, isFav: boolean) => {
    try {
      if (!isFav) {
        await fetch(`/api/users/${DEFAULT_USER_ID}/favorites/${itemId}`, {
          method: 'DELETE',
        });
        setFavorites((prev) => prev.filter((item) => item.id !== itemId));
      }
    } catch (err) {
      console.error('取消收藏失败', err);
    }
  };

  return (
    <div className="app-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        返回
      </button>

      <div className="home-header">
        <h1 className="app-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Heart size={24} fill="#e53935" stroke="#e53935" />
          我的收藏
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>加载中...</div>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
          <Heart size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>还没有收藏任何物品</p>
          <p style={{ fontSize: '14px' }}>去主页看看有什么感兴趣的吧～</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '20px', maxWidth: '200px', margin: '20px auto 0' }}
            onClick={() => navigate('/')}
          >
            去逛逛
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {favorites.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isFavorite={true}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFavoritesPage;
