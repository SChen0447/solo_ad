import { useState, useEffect } from 'react';
import { api } from './api';
import RecipeCard from './RecipeCard';
import CommunityFeed from './CommunityFeed';
import type { Recipe, CuisineType, SortType } from './types';
import './HomePage.css';

interface HomePageProps {
  socket: any;
}

const cuisineOptions: { value: CuisineType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'chinese', label: '中餐' },
  { value: 'japanese', label: '日料' },
  { value: 'western', label: '西餐' },
  { value: 'other', label: '其他' },
];

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'newest', label: '最新发布' },
  { value: 'rating', label: '评分最高' },
];

export default function HomePage({ socket }: HomePageProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [cuisine, setCuisine] = useState<CuisineType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [showCommunity, setShowCommunity] = useState(true);
  const limit = 12;

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const data = await api.recipes.list({
          page,
          limit,
          sort,
          cuisine: cuisine === 'all' ? undefined : cuisine,
        });
        setRecipes(data.recipes);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch recipes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [page, cuisine, sort]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">发现美食，分享快乐</h1>
          <p className="hero-subtitle">
            探索数千道精选食谱，和社区一起烹饪美味
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{total}</span>
              <span className="stat-label">道食谱</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">实时</span>
              <span className="stat-label">协作计时</span>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="recipe-list-section">
          <div className="filter-bar">
            <div className="filter-tabs">
              {cuisineOptions.map((option) => (
                <button
                  key={option.value}
                  className={`filter-tab ${cuisine === option.value ? 'active' : ''}`}
                  onClick={() => {
                    setCuisine(option.value);
                    setPage(1);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="sort-select">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortType);
                  setPage(1);
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mobile-community-toggle">
            <button
              className={`toggle-btn ${showCommunity ? 'active' : ''}`}
              onClick={() => setShowCommunity(!showCommunity)}
            >
              🔥 社区动态 {showCommunity ? '▲' : '▼'}
            </button>
          </div>

          {showCommunity && (
            <div className="mobile-community">
              <CommunityFeed socket={socket} />
            </div>
          )}

          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-content">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-desc" />
                    <div className="skeleton-line skeleton-meta" />
                  </div>
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <p>🍽️ 暂无食谱</p>
              <p className="empty-subtext">换个分类试试吧</p>
            </div>
          ) : (
            <>
              <div className="recipe-grid">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一页
                  </button>
                  <span className="page-info">
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    className="page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar">
          <CommunityFeed socket={socket} />
        </div>
      </div>
    </div>
  );
}
