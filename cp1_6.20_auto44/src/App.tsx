import { useState, useEffect, useCallback } from 'react';
import NewsFeed from './NewsFeed';
import ArticleDetail from './ArticleDetail';
import { NewsItem } from './types';
import { fetchNewsList } from './api';
import './styles/App.css';

const categories = ['全部', '科技', '财经', '体育', '娱乐', '国际'];

const categoryColors: Record<string, string> = {
  '全部': '#3498DB',
  '科技': '#E74C3C',
  '财经': '#27AE60',
  '体育': '#F39C12',
  '娱乐': '#9B59B6',
  '国际': '#1ABC9C'
};

function App() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [favorites, setFavorites] = useState<NewsItem[]>([]);
  const [expandedArticle, setExpandedArticle] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animatingKey, setAnimatingKey] = useState(0);

  const loadNewsBatch = useCallback(async (page: number, category: string) => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const result = await fetchNewsList(page, 10, category);
      const newItems = result.data;
      if (page === 1) {
        setNewsList(newItems);
      } else {
        setNewsList(prev => [...prev, ...newItems]);
      }
      setCurrentPage(page);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore]);

  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      setNewsList([]);
      setCurrentPage(0);
      setHasMore(true);
      setAnimatingKey(prev => prev + 1);
      
      try {
        const requests = [1, 2, 3].map(page =>
          fetchNewsList(page, 10, selectedCategory)
        );
        const results = await Promise.all(requests);
        const allNews = results.flatMap(r => r.data);
        setNewsList(allNews);
        setCurrentPage(3);
        setHasMore(results[0].hasMore);
      } catch (error) {
        console.error('Failed to load initial news:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initLoad();
  }, [selectedCategory]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadNewsBatch(currentPage + 1, selectedCategory);
    }
  }, [currentPage, selectedCategory, isLoading, hasMore, loadNewsBatch]);

  const toggleFavorite = useCallback((news: NewsItem) => {
    setFavorites(prev => {
      const exists = prev.find(item => item.id === news.id);
      if (exists) {
        return prev.filter(item => item.id !== news.id);
      } else {
        return [news, ...prev].slice(0, 5);
      }
    });
  }, []);

  const isFavorite = useCallback((id: number) => {
    return favorites.some(item => item.id === id);
  }, [favorites]);

  const openArticle = useCallback((news: NewsItem) => {
    setExpandedArticle(news);
    setSidebarOpen(false);
  }, []);

  const closeArticle = useCallback(() => {
    setExpandedArticle(null);
  }, []);

  const scrollToArticle = useCallback((news: NewsItem) => {
    setExpandedArticle(null);
    setSidebarOpen(false);
    setTimeout(() => {
      const element = document.getElementById(`news-${news.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📰</span>
            <h1>AI新闻摘要</h1>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>
      </header>

      <div className="category-tabs">
        <div className="category-tabs-inner">
          {categories.map((cat, index) => (
            <button
              key={cat}
              className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
              style={{
                color: selectedCategory === cat ? categoryColors[cat] : '#2C3E50'
              }}
            >
              {cat}
              {selectedCategory === cat && (
                <span 
                  className="tab-indicator"
                  style={{ backgroundColor: categoryColors[cat] }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="app-main">
        <main className="main-content">
          {expandedArticle ? (
            <ArticleDetail
              article={expandedArticle}
              onClose={closeArticle}
              isFavorite={isFavorite(expandedArticle.id)}
              onToggleFavorite={() => toggleFavorite(expandedArticle)}
            />
          ) : (
            <NewsFeed
              key={animatingKey}
              newsList={newsList}
              onOpenArticle={openArticle}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              onLoadMore={loadMore}
              isLoading={isLoading}
              hasMore={hasMore}
            />
          )}
        </main>

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>⭐ 我的收藏</h3>
            <span className="favorites-count">{favorites.length}/5</span>
          </div>
          <div className="favorites-list">
            {favorites.length === 0 ? (
              <p className="empty-favorites">暂无收藏</p>
            ) : (
              favorites.map(news => (
                <div
                  key={news.id}
                  className="favorite-card"
                  onClick={() => scrollToArticle(news)}
                >
                  <div className="favorite-card-title">{news.title}</div>
                  <div className="favorite-card-tag">{news.ai_tag}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
