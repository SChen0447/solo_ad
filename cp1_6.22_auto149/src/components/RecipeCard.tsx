import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/recipe/${recipe.id}`);
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      let cls = 'star-empty';
      if (i < full) cls = 'star-full';
      else if (i === full && half) cls = 'star-half';
      stars.push(<span key={i} className={`star ${cls}`}>★</span>);
    }
    return stars;
  };

  return (
    <div className="recipe-card" onClick={handleClick}>
      <div className="recipe-cover" style={{ background: `linear-gradient(135deg, #f5e6d3 0%, #e8d5b7 100%)`, backgroundImage: recipe.cover ? `url(${recipe.cover})` : undefined }}>
        {!recipe.cover && <div className="cover-emoji">🍰</div>}
      </div>
      <div className="recipe-body">
        <h3 className="recipe-title">{recipe.title}</h3>
        <div className="recipe-meta">
          <img src={recipe.author.avatar} alt={recipe.author.name} className="author-avatar" />
          <span className="author-name">{recipe.author.name}</span>
        </div>
        <div className="recipe-rating">
          <div className="stars">{renderStars(recipe.rating)}</div>
          <span className="rating-text">{recipe.rating.toFixed(1)} ({recipe.reviewCount})</span>
        </div>
        <div className="recipe-tags">
          {recipe.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
