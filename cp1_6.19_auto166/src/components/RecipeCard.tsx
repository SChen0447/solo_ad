import { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import type { RecipeListItem } from '@/data/recipeData';
import { likeRecipe } from '@/data/recipeData';

interface RecipeCardProps {
  recipe: RecipeListItem;
  onClick: (id: string) => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const [liked, setLiked] = useState(recipe.liked);
  const [likes, setLikes] = useState(recipe.likes);
  const [pulse, setPulse] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await likeRecipe(recipe.id);
      if (result.success) {
        setLiked(result.liked);
        setLikes(result.likes);
        setPulse(true);
        setTimeout(() => setPulse(false), 300);
      }
    } catch {}
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = i <= Math.floor(recipe.rating);
      const half = !filled && i - 0.5 <= recipe.rating;
      stars.push(
        <Star
          key={i}
          size={14}
          className={`inline-block transition-transform duration-200 group-hover:scale-110 ${
            filled
              ? 'fill-amber-400 text-amber-400'
              : half
              ? 'fill-amber-400/50 text-amber-400'
              : 'text-amber-400/30'
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <div
      className="group bg-white rounded-lg overflow-hidden shadow-md card-hover cursor-pointer break-inside-avoid mb-8"
      onClick={() => onClick(recipe.id)}
    >
      <div className="relative overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.title}
          loading="lazy"
          className="w-full h-48 sm:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
          <span className="text-sm font-semibold text-burnt">{recipe.rating}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-charcoal mb-2 leading-snug">
          {recipe.title}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <img
            src={recipe.authorAvatar}
            alt={recipe.author}
            loading="lazy"
            className="w-6 h-6 rounded-full object-cover ring-1 ring-warm-border"
          />
          <span className="text-sm text-warm-gray">{recipe.author}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 group/rating">
            {renderStars()}
          </div>

          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-all duration-300 ease-out rounded-full px-2 py-1 btn-hover
              ${liked ? 'text-red-500' : 'text-warm-gray hover:text-red-400'}
              ${pulse ? 'animate-pulse-like' : ''}
            `}
          >
            <Heart
              size={18}
              className={`transition-all duration-300 ${liked ? 'fill-red-500' : 'fill-transparent'}`}
            />
            <span className="text-xs font-medium">{likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
