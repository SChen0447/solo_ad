import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Plus, Eye, Clock } from 'lucide-react';
import type { Item, User } from '../backend/types';

interface ProfilePageProps {
  userId: string;
  userData: User | null;
  onUserDataUpdate: (user: User) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, userData, onUserDataUpdate }) => {
  const navigate = useNavigate();
  const [publishedItems, setPublishedItems] = useState<Item[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<'published' | 'favorites'>('published');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndItems = async () => {
      try {
        const [userResponse, itemsResponse, favoritesResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/items`),
          fetch(`/api/users/${userId}/favorites`),
        ]);

        const userDataResponse = await userResponse.json();
        const itemsData = await itemsResponse.json();
        const favoritesData = await favoritesResponse.json();

        onUserDataUpdate(userDataResponse);
        setPublishedItems(itemsData);
        setFavoriteItems(favoritesData);
      } catch (error) {
        console.error('获取用户数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndItems();
  }, [userId, onUserDataUpdate]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return '等待中';
      case 'sent':
        return '已送出';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/item/${itemId}`);
  };

  const handlePublishClick = () => {
    navigate('/publish');
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

  if (!userData) {
    return null;
  }

  const currentItems = activeTab === 'published' ? publishedItems : favoriteItems;

  return (
    <div className="container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img src={userData.avatar} alt={userData.name} />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userData.name}</h1>
          <div className="profile-points">
            <Star size={20} className="star-icon" />
            <span className="points-number">{userData.points} 积分</span>
          </div>
          <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
            发布了 {userData.publishedItems.length} 个物品 · 收藏了 {userData.favoriteItems.length} 个物品
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <button
          className={`btn-primary ${activeTab === 'published' ? 'active' : ''}`}
          onClick={() => setActiveTab('published')}
          style={{
            background:
              activeTab === 'published'
                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                : 'white',
            color: activeTab === 'published' ? 'white' : '#374151',
            border:
              activeTab === 'published' ? 'none' : '2px solid #e5e7eb',
          }}
        >
          我的发布
        </button>
        <button
          className={`btn-primary ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
          style={{
            background:
              activeTab === 'favorites'
                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                : 'white',
            color: activeTab === 'favorites' ? 'white' : '#374151',
            border:
              activeTab === 'favorites' ? 'none' : '2px solid #e5e7eb',
          }}
        >
          我的收藏
        </button>
      </div>

      {currentItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {activeTab === 'published' ? '📦' : '❤️'}
          </div>
          <p>
            {activeTab === 'published'
              ? '你还没有发布任何物品'
              : '你还没有收藏任何物品'}
          </p>
          {activeTab === 'published' && (
            <button
              className="btn-primary"
              style={{ marginTop: '16px' }}
              onClick={handlePublishClick}
            >
              <Plus size={18} />
              发布第一个漂流瓶
            </button>
          )}
        </div>
      ) : (
        <div className="item-list">
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="item-row"
              onClick={() => handleItemClick(item.id)}
            >
              <img src={item.images[0]} alt={item.name} />
              <div className="item-row-info">
                <div className="item-row-name">{item.name}</div>
                <div className="item-row-meta">
                  <span
                    className={`status-badge status-${item.status}`}
                  >
                    {getStatusText(item.status)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={14} />
                    {item.views}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={handlePublishClick}
        aria-label="发布漂流瓶"
      >
        <Plus size={28} color="white" />
      </button>
    </div>
  );
};

export default ProfilePage;
