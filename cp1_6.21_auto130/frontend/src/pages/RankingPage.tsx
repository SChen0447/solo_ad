import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, MessageSquare, Heart, Medal } from 'lucide-react';
import type { Book } from '../types';
import { booksApi } from '../api';
import './RankingPage.css';

export default function RankingPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        const response = await booksApi.getRanking();
        setBooks(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'gold';
      case 1:
        return 'silver';
      case 2:
        return 'bronze';
      default:
        return 'default';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="ranking-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`ranking-star ${star <= Math.round(rating) ? 'filled' : ''}`}
            fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="ranking-page">
      <div className="page-header">
        <h1 className="page-title">🏆 书评排行榜</h1>
        <p className="page-subtitle">读者口碑推荐</p>
      </div>

      <div className="ranking-header-card">
        <div className="ranking-header-icon">
          <Trophy size={32} />
        </div>
        <div className="ranking-header-info">
          <h2>图书评分排行榜</h2>
          <p>根据读者评分和评价数量综合排名</p>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>加载失败: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="ranking-list">
          {books.map((book, index) => (
            <div
              key={book.id}
              className={`ranking-item ${getMedalColor(index)}`}
              onClick={() => navigate(`/book/${book.id}`)}
            >
              <div className="ranking-rank">
                {index < 3 ? (
                  <Medal
                    size={24}
                    className={`rank-medal ${getMedalColor(index)}`}
                  />
                ) : (
                  <span className="rank-number">{index + 1}</span>
                )}
              </div>

              <div
                className="ranking-cover"
                style={{ background: book.cover_gradient }}
              >
                <span>{book.title.charAt(0)}</span>
              </div>

              <div className="ranking-info">
                <h3 className="ranking-title">{book.title}</h3>
                <p className="ranking-author">{book.author}</p>
                <div className="ranking-meta">
                  <div className="meta-item">
                    <Star size={14} fill="#fbbf24" />
                    <span className="rating-value">{book.avg_rating.toFixed(1)}</span>
                  </div>
                  <div className="meta-item">
                    <MessageSquare size={14} />
                    <span>{book.review_count} 条评价</span>
                  </div>
                  <div className="meta-item">
                    <Heart size={14} />
                    <span>{book.likes} 点赞</span>
                  </div>
                </div>
              </div>

              <div className="ranking-score">
                <div className="score-display">
                  {renderStars(book.avg_rating)}
                </div>
                <span className="score-text">{book.avg_rating.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
