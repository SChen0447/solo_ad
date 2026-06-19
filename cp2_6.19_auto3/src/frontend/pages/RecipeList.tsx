import { useState, useEffect, useCallback, useRef } from 'react';
import RecipeCard from '../components/RecipeCard';
import SkeletonCard from '../components/SkeletonCard';
import { fetchRecipes } from '../api';
import type { Recipe } from '../types';

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const loadRecipes = useCallback(async (pageNum: number) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await fetchRecipes(pageNum, 8);
      setRecipes(prev => pageNum === 1 ? res.data : [...prev, ...res.data]);
      setTotal(res.total);
    } catch (err) {
      console.error('加载食谱失败', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadRecipes(1);
  }, [loadRecipes]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore && recipes.length < total && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadRecipes(nextPage);
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingMore, recipes.length, total, page, loadRecipes, loading]);

  return (
    <div className="recipe-list-page">
      <section className="hero-section">
        <h1 className="hero-title">发现美味</h1>
        <p className="hero-subtitle">每一道私房菜，都值得被分享 ✨</p>
      </section>

      {loading ? (
        <div className="masonry-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="masonry-grid">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
            {loadingMore && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`more-${i}`} />
            ))}
          </div>

          <div ref={loaderRef} className="scroll-loader">
            {recipes.length >= total && recipes.length > 0 && (
              <p className="no-more">— 已经到底啦 —</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
