import { useEffect, useState, useMemo } from 'react';
import RecipeCard from '../components/RecipeCard';
import type { Recipe } from '../types';
import './ExplorePage.css';

interface ExplorePageProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showFavoritesOnly?: boolean;
}

const ALL_TAGS = ['新手友好', '低糖', '巧克力', '蛋糕', '面包', '吐司', '早餐', '高级', '法式', '马卡龙', '抹茶', '慕斯', '水果', '下午茶', '酥皮', '千层'];

export default function ExplorePage({ searchQuery = '', onSearchChange, showFavoritesOnly = false }: ExplorePageProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [localSearch, setLocalSearch] = useState('');

  const effectiveSearch = searchQuery || localSearch;

  useEffect(() => {
    setLoading(true);
    const url = showFavoritesOnly ? '/api/recipes/favorites' : '/api/recipes';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setTimeout(() => {
          setRecipes(data);
          setLoading(false);
        }, showFavoritesOnly ? 200 : 500);
      })
      .catch(() => {
        setRecipes([]);
        setLoading(false);
      });
  }, [showFavoritesOnly]);

  const filteredRecipes = useMemo(() => {
    let list = recipes;
    if (effectiveSearch) {
      const s = effectiveSearch.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        r.tags.some(t => t.toLowerCase().includes(s)) ||
        r.author.name.toLowerCase().includes(s)
      );
    }
    if (selectedTags.length) {
      list = list.filter(r => selectedTags.every(t => r.tags.includes(t)));
    }
    return list;
  }, [recipes, effectiveSearch, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  return (
    <div className="explore-page">
      <div className="explore-hero">
        <div className="hero-content">
          <h1>
            <span className="hero-emoji">🧁</span>
            {showFavoritesOnly ? '我的收藏食谱' : '发现美味烘焙食谱'}
          </h1>
          <p className="hero-subtitle">
            {showFavoritesOnly
              ? '你收藏的所有美味食谱都在这里'
              : '从经典曲奇到高级法式甜点，探索上千个烘焙爱好者分享的配方'}
          </p>
          {!showFavoritesOnly && !onSearchChange && (
            <div className="hero-search">
              <input
                type="text"
                placeholder="搜索食谱、标签或作者..."
                value={effectiveSearch}
                onChange={handleSearchChange}
                className="hero-search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          )}
        </div>
      </div>

      {!showFavoritesOnly && (
        <div className="tags-filter">
          <div className="tags-header">
            <span className="tags-label">🏷️ 标签筛选</span>
            {selectedTags.length > 0 && (
              <button className="clear-tags-btn" onClick={() => setSelectedTags([])}>
                清除全部 ({selectedTags.length})
              </button>
            )}
          </div>
          <div className="tags-list">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                className={`tag-chip ${selectedTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="results-bar">
        <span className="results-count">
          {loading ? '加载中...' : `共 ${filteredRecipes.length} 个食谱`}
          {effectiveSearch && !loading && ` · 搜索 "${effectiveSearch}"`}
          {selectedTags.length > 0 && !loading && ` · 已选 ${selectedTags.length} 个标签`}
        </span>
      </div>

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-cover" />
              <div className="skeleton-body">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-author" />
                <div className="skeleton-line skeleton-rating" />
                <div className="skeleton-tags">
                  <div className="skeleton-tag" />
                  <div className="skeleton-tag" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🍪</div>
          <h3>没有找到匹配的食谱</h3>
          <p>试试其他关键词或清除筛选条件吧~</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
