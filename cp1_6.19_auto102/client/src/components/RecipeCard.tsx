import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    likes: number;
    views: number;
    comment_count: number;
    author_name?: string;
    tags?: string;
  };
  index: number;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const placeholderColors = [
    'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ];
  const bgStyle = placeholderColors[index % placeholderColors.length];

  const tags = recipe.tags ? recipe.tags.split(',').slice(0, 2) : [];

  return (
    <div
      ref={cardRef}
      className={`recipe-card ${isVisible ? 'fade-in' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <Link to={`/recipe/${recipe.id}`} className="card-link">
        <div className="card-image">
          {recipe.thumbnail ? (
            <>
              {!imageLoaded && <div className="image-placeholder" style={{ background: bgStyle }} />}
              <img
                src={recipe.thumbnail}
                alt={recipe.title}
                className={imageLoaded ? 'loaded' : ''}
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="image-placeholder" style={{ background: bgStyle }}>
              <span className="placeholder-icon">🍽️</span>
            </div>
          )}
          {tags.length > 0 && (
            <div className="card-tags">
              {tags.map((tag, i) => (
                <span key={i} className="card-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="card-content">
          <h3 className="card-title">{recipe.title}</h3>
          <p className="card-desc">{recipe.description}</p>
          <div className="card-stats">
            <span className="stat">
              <span className="stat-icon">❤️</span>
              <span className="stat-text">{recipe.likes}</span>
            </span>
            <span className="stat">
              <span className="stat-icon">💬</span>
              <span className="stat-text">{recipe.comment_count || 0}</span>
            </span>
            <span className="stat">
              <span className="stat-icon">👁️</span>
              <span className="stat-text">{recipe.views}</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RecipeCard;
