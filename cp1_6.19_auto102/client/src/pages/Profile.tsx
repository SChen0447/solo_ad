import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import { useUser } from '../context/UserContext';
import './Profile.css';

interface Recipe {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  likes: number;
  views: number;
  comment_count: number;
  tags: string;
}

interface Badge {
  id: number;
  badge_key: string;
  badge_name: string;
  description: string;
  unlocked_at: string;
}

interface ProfileData {
  user: {
    id: number;
    username: string;
    email: string;
    avatar: string;
    bio: string;
    created_at: string;
  };
  recipes: Recipe[];
  recipeCount: number;
  favoriteCount: number;
  badges: Badge[];
}

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, token } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites' | 'badges'>('recipes');
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [favorites, setFavorites] = useState<Recipe[]>([]);

  const userId = id || currentUser?.id?.toString();
  const isOwnProfile = currentUser && userId === currentUser.id.toString();

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (isOwnProfile && activeTab === 'favorites') {
      fetchFavorites();
    }
  }, [isOwnProfile, activeTab]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/profile/${userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setEditBio(data.data.user.bio || '');
      }
    } catch (err) {
      console.error('获取用户信息失败', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/users/favorites/list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setFavorites(data.data.map((f: any) => ({
          id: f.recipe_id,
          title: f.title,
          description: '',
          thumbnail: f.thumbnail,
          likes: f.likes,
          views: f.views,
          comment_count: f.comment_count,
          tags: '',
        })));
      }
    } catch (err) {
      console.error('获取收藏列表失败', err);
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: editBio }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) =>
          prev ? { ...prev, user: data.data.user } : prev
        );
        setIsEditing(false);
      }
    } catch (err) {
      console.error('更新简介失败', err);
    }
  };

  if (loading) {
    return <div className="profile-loading">加载中...</div>;
  }

  if (!profile) {
    return <div className="profile-loading">用户不存在</div>;
  }

  const { user, recipes, recipeCount, favoriteCount, badges } = profile;

  return (
    <div className="profile-page">
      <div className="profile-header fade-in">
        <div className="profile-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <div className="avatar-placeholder">
              {user.username?.charAt(0)}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.username}</h1>

          {isOwnProfile ? (
            isEditing ? (
              <div className="bio-edit">
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="介绍一下自己..."
                  rows={2}
                />
                <div className="bio-actions">
                  <button onClick={() => setIsEditing(false)}>取消</button>
                  <button className="save-btn" onClick={handleSaveBio}>
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="bio-display">
                <p className="profile-bio">{user.bio || '这个人很懒，什么都没写～'}</p>
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  编辑简介
                </button>
              </div>
            )
          ) : (
            <p className="profile-bio">{user.bio || '这个人很懒，什么都没写～'}</p>
          )}

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-number">{recipeCount}</span>
              <span className="stat-label">菜谱</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{favoriteCount}</span>
              <span className="stat-label">收藏</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{badges.length}</span>
              <span className="stat-label">徽章</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          发布的菜谱
        </button>
        {isOwnProfile && (
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            我的收藏
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          成就徽章
        </button>
      </div>

      <div className="profile-content fade-in">
        {activeTab === 'recipes' && (
          <div className="recipes-grid">
            {recipes.length > 0 ? (
              recipes.map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} index={index} />
              ))
            ) : (
              <div className="empty-state">
                <p>还没有发布菜谱哦～</p>
                {isOwnProfile && (
                  <Link to="/editor" className="create-link">
                    去发布第一份菜谱
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && isOwnProfile && (
          <div className="recipes-grid">
            {favorites.length > 0 ? (
              favorites.map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} index={index} />
              ))
            ) : (
              <div className="empty-state">
                <p>还没有收藏菜谱哦～</p>
                <Link to="/" className="create-link">
                  去发现美食
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="badges-grid">
            {badges.length > 0 ? (
              badges.map((badge) => (
                <div key={badge.id} className="badge-card fade-in">
                  <div className="badge-icon">🏆</div>
                  <div className="badge-info">
                    <h4 className="badge-name">{badge.badge_name}</h4>
                    <p className="badge-desc">{badge.description}</p>
                    <span className="badge-date">
                      {new Date(badge.unlocked_at).toLocaleDateString('zh-CN')} 获得
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>还没有获得徽章哦～</p>
                <p className="hint">发布更多菜谱来解锁成就吧！</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
