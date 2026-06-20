import { useEffect, useRef } from 'react';
import { NewsItem } from './types';
import './styles/NewsFeed.css';

interface NewsFeedProps {
  newsList: NewsItem[];
  onOpenArticle: (news: NewsItem) => void;
  onToggleFavorite: (news: NewsItem) => void;
  isFavorite: (id: number) => boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

function NewsFeed({
  newsList,
  onOpenArticle,
  onToggleFavorite,
  isFavorite,
  onLoadMore,
  isLoading,
  hasMore
}: NewsFeedProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoading]);

  return (
    <div className="news-feed">
      <div className="masonry-grid">
        {newsList.map((news, index) => (
          <div
            key={news.id}
            id={`news-${news.id}`}
            className="news-card"
            style={{ animationDelay: `${(index % 10) * 0.05}s` }}
          >
            <div className="card-content">
              <div className="card-header">
                <span className="ai-tag">
                  <span className="ai-icon">✨</span>
                  {news.ai_tag}
                </span>
                <button
                  className={`favorite-btn ${isFavorite(news.id) ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(news);
                  }}
                >
                  {isFavorite(news.id) ? '⭐' : '☆'}
                </button>
              </div>
              
              <h3 className="card-title">{news.title}</h3>
              
              <p className="card-summary">{news.summary}</p>
              
              <div className="card-footer">
                <span className="category-badge">{news.category}</span>
                <button
                  className="read-more-btn"
                  onClick={() => onOpenArticle(news)}
                >
                  展开阅读 →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div ref={loadMoreRef} className="load-more-trigger">
        {isLoading && (
          <div className="loading-spinner">
            <div className="spinner" />
            <span>加载中...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsFeed;
