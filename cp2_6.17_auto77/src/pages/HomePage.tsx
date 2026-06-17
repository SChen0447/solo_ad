import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Heart } from 'lucide-react';
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

const categories = [
  { value: 'all', label: '全部' },
  { value: 'electronics', label: '电子产品' },
  { value: 'books', label: '书籍' },
  { value: 'home', label: '家居' },
  { value: 'clothing', label: '服饰' },
  { value: 'other', label: '其他' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasNewMatches, setHasNewMatches] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: 'electronics',
    desiredTags: '',
  });

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${DEFAULT_USER_ID}/favorites`);
      const result = await res.json();
      if (result.success) {
        setFavoriteIds(new Set(result.data.map((item: Item) => item.id)));
      }
    } catch (err) {
      console.error('获取收藏列表失败', err);
    }
  }, []);

  const fetchItems = useCallback(async (query: string, category: string) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (category && category !== 'all') params.append('category', category);
      params.append('page', '1');

      const res = await fetch(`/api/items?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setItems(result.data.items);
      }
    } catch (err) {
      console.error('获取物品列表失败', err);
    }
  }, []);

  useEffect(() => {
    fetchItems(debouncedQuery, selectedCategory);
    fetchFavorites();
  }, [debouncedQuery, selectedCategory, fetchItems, fetchFavorites]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getSuggestions = (): Item[] => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      )
      .slice(0, 5);
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (itemId: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/items/${itemId}`);
  };

  const handleToggleFavorite = async (itemId: string, isFav: boolean) => {
    try {
      if (isFav) {
        await fetch(`/api/users/${DEFAULT_USER_ID}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        });
        setFavoriteIds((prev) => new Set([...prev, itemId]));
      } else {
        await fetch(`/api/users/${DEFAULT_USER_ID}/favorites/${itemId}`, {
          method: 'DELETE',
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    } catch (err) {
      console.error('切换收藏状态失败', err);
    }
  };

  const handlePublish = async () => {
    if (!publishForm.title.trim() || !publishForm.desiredTags.trim()) {
      return;
    }

    try {
      const tags = publishForm.desiredTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 3);

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: publishForm.title,
          description: publishForm.description,
          imageUrl: publishForm.imageUrl,
          category: publishForm.category,
          desiredTags: tags,
          ownerId: 'user1',
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (result.data.recommendations && result.data.recommendations.length > 0) {
          setHasNewMatches(true);
        }
        setShowPublishModal(false);
        setPublishForm({
          title: '',
          description: '',
          imageUrl: '',
          category: 'electronics',
          desiredTags: '',
        });
        fetchItems(debouncedQuery, selectedCategory);
      }
    } catch (err) {
      console.error('发布物品失败', err);
    }
  };

  return (
    <div className="app-container">
      <div className="home-header">
        <h1 className="app-title">闲置物品交换市集</h1>
        <button
          className="my-favorites-btn"
          onClick={() => navigate('/favorites')}
          title="我的收藏"
        >
          <Heart size={20} fill="#4caf50" stroke="#4caf50" />
          <span>我的收藏</span>
          {favoriteIds.size > 0 && <span className="fav-count">{favoriteIds.size}</span>}
        </button>
        {hasNewMatches && (
          <div
            className="match-notification"
            onClick={() => setHasNewMatches(false)}
            title="有新的匹配推荐"
          />
        )}
      </div>

      <div className="search-container">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="search-bar"
          placeholder="搜索闲置物品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((item) => (
              <div
                key={item.id}
                className="search-suggestion-item"
                onMouseDown={() => handleSuggestionClick(item.id)}
              >
                {item.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="category-filter">
        {categories.map((cat) => (
          <div
            key={cat.value}
            className={`category-tag ${selectedCategory === cat.value ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </div>
        ))}
      </div>

      <div className="items-grid">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isFavorite={favoriteIds.has(item.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>

      <button className="publish-btn" onClick={() => setShowPublishModal(true)}>
        <Plus size={28} />
      </button>

      {showPublishModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPublishModal(false);
          }}
        >
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="modal-title">发布闲置物品</h2>
              <button
                onClick={() => setShowPublishModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">物品标题 *</label>
              <input
                type="text"
                className="form-input"
                value={publishForm.title}
                onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                placeholder="请输入物品标题"
              />
            </div>

            <div className="form-group">
              <label className="form-label">物品描述</label>
              <textarea
                className="form-textarea"
                value={publishForm.description}
                onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                placeholder="请输入物品描述"
              />
            </div>

            <div className="form-group">
              <label className="form-label">图片URL</label>
              <input
                type="text"
                className="form-input"
                value={publishForm.imageUrl}
                onChange={(e) => setPublishForm({ ...publishForm, imageUrl: e.target.value })}
                placeholder="请输入图片链接"
              />
            </div>

            <div className="form-group">
              <label className="form-label">物品分类</label>
              <select
                className="form-select"
                value={publishForm.category}
                onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value })}
              >
                {categories.filter((c) => c.value !== 'all').map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">期望交换标签 *</label>
              <input
                type="text"
                className="form-input"
                value={publishForm.desiredTags}
                onChange={(e) => setPublishForm({ ...publishForm, desiredTags: e.target.value })}
                placeholder="请输入期望交换的物品标签，用逗号分隔（最多3个）"
              />
              <p className="form-hint">例如：华为手机,平板,耳机</p>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPublishModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handlePublish}>
                发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
