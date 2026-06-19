import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import Masonry from '../components/Masonry';
import './Home.css';

interface Recipe {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  likes: number;
  views: number;
  comment_count: number;
  author_name: string;
  tags: string;
}

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('latest');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchQuery = searchParams.get('search') || '';

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes/tags/list');
      const data = await res.json();
      if (data.success) {
        setAllTags(data.data);
      }
    } catch (err) {
      console.error('获取标签失败', err);
    }
  }, []);

  const fetchRecipes = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        sort,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

      const res = await fetch(`/api/recipes?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (reset) {
          setRecipes(data.data.recipes);
        } else {
          setRecipes((prev) => [...prev, ...data.data.recipes]);
        }
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('获取菜谱失败', err);
    } finally {
      setLoading(false);
    }
  }, [loading, sort, searchQuery, selectedTags]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    setPage(1);
    setRecipes([]);
    fetchRecipes(1, true);
  }, [sort, searchQuery, selectedTags]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && recipes.length < total && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [recipes.length, total, loading]);

  useEffect(() => {
    if (page > 1) {
      fetchRecipes(page);
    }
  }, [page, fetchRecipes]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const highlightedRecipes = recipes.map((recipe) => {
    if (!searchQuery) return recipe;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return {
      ...recipe,
      title: recipe.title.replace(regex, '<mark class="highlight">$1</mark>'),
      description: recipe.description.replace(
        regex,
        '<mark class="highlight">$1</mark>'
      ),
    };
  });

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="page-title">
          {searchQuery ? `搜索 "${searchQuery}" 的结果` : '发现美食'}
        </h1>
        <div className="filter-bar">
          <div className="sort-tabs">
            <button
              className={`sort-tab ${sort === 'latest' ? 'active' : ''}`}
              onClick={() => setSort('latest')}
            >
              最新
            </button>
            <button
              className={`sort-tab ${sort === 'popular' ? 'active' : ''}`}
              onClick={() => setSort('popular')}
            >
              最热门
            </button>
          </div>
        </div>
      </div>

      <div className="tags-filter">
        <span className="tags-label">标签筛选：</span>
        <div className="tags-list">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {loading && recipes.length === 0 ? (
        <div className="loading-state">加载中...</div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>暂无菜谱，快来发布第一份菜谱吧～</p>
        </div>
      ) : (
        <>
          <Masonry>
            {highlightedRecipes.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe as any}
                index={index}
              />
            ))}
          </Masonry>

          <div ref={sentinelRef} className="load-more">
            {loading && <div className="loading-spinner">加载更多...</div>}
            {recipes.length >= total && total > 0 && (
              <div className="no-more">— 没有更多了 —</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
