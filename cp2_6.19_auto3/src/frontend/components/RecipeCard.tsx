import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../types';

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card">
      <div className="card-cover" ref={imgRef}>
        {!loaded && !imgError && <div className="card-skeleton" />}
        {isVisible && !imgError ? (
          <img
            src={recipe.coverImage}
            alt={recipe.title}
            loading="lazy"
            className={loaded ? 'loaded' : ''}
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : null}
        {imgError && <div className="card-cover-fallback">🍽️</div>}
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
