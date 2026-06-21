import { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import { booksApi } from '../api';
import './RecommendCard.css';

interface RecommendCardProps {
  book: Book;
}

export default function RecommendCard({ book }: RecommendCardProps) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(book.likes);
  const [showFloat, setShowFloat] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked || isAnimating) return;

    setIsAnimating(true);
    setIsLiked(true);
    setLikes((prev) => prev + 1);
    setShowFloat(true);

    setTimeout(() => {
      setShowFloat(false);
    }, 800);

    try {
      await booksApi.likeBook(book.id);
    } catch (error) {
      setIsLiked(false);
      setLikes((prev) => prev - 1);
      console.error('点赞失败:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/book/${book.id}`);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="card-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`star-icon ${star <= Math.round(rating) ? 'filled' : ''}`}
          />
        ))}
      </div>
    );
  };

  const firstLetter = book.title.charAt(0);

  return (
    <div className="recommend-card" onClick={handleCardClick}>
      <div 
        className="card-cover"
        style={{ background: book.cover_gradient }}
      >
        <span className="card-cover-letter">{firstLetter}</span>
      </div>
      
      <div className="card-content">
        <h3 className="card-title" title={book.title}>{book.title}</h3>
        <p className="card-author">{book.author}</p>
        
        <p className="card-reason" title={book.recommend_reason}>
          {book.recommend_reason}
        </p>
      </div>

      <div className="card-footer">
        <div className="card-rating">
          {renderStars(book.avg_rating)}
          <span className="rating-text">{book.avg_rating.toFixed(1)}</span>
        </div>
        
        <button 
          className={`like-button ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          aria-label="点赞"
        >
          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="like-count">{likes}</span>
          {showFloat && (
            <span className="like-float">+1</span>
          )}
        </button>
      </div>
    </div>
  );
}
