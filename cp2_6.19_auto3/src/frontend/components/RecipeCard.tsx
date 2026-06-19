import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../types';

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLAnchorElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '300px 200px', threshold: 0.01 }
    );

    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleError = () => {
    setImgError(true);
    setLoaded(false);
  };

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card" ref={containerRef}>
      <div className="card-cover">
        {!loaded && !imgError && <div className="card-skeleton" />}

        {shouldLoad && !imgError && (
          <img
            data-src={recipe.coverImage}
            src={recipe.coverImage}
            alt={recipe.title}
            className={loaded ? 'loaded' : 'loading'}
            onLoad={() => setLoaded(true)}
            onError={handleError}
            draggable={false}
          />
        )}

        {imgError && (
          <div className="card-cover-fallback">
            <span className="fallback-icon">🍽️</span>
            <span className="fallback-text">图片加载失败</span>
          </div>
        )}

        <div className="card-like-badge">
          <span>❤️</span>
          <span>{recipe.likes}</span>
        </div>
      </div>
      <div className="card-body">
        <h3 className="card-title">{recipe.title}</h3>
        <p className="card-meta">
          <span>🥗 {recipe.ingredients.length} 种食材</span>
          <span>📝 {recipe.steps.length} 个步骤</span>
        </p>
      </div>
    </Link>
  );
}
