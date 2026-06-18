import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CategoryType } from './types';
import { cardService } from './services/cardService';
import { favoriteService } from './services/favoriteService';
import SearchFilter from './SearchFilter';
import CardList from './CardList';
import CardDetail from './CardDetail';
import './styles.css';

type ViewMode = 'list' | 'detail';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [favorites, setFavorites] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newCard, setNewCard] = useState({
    title: '',
    category: '前端',
    content: '',
    difficulty: 3
  });
  const searchTimeoutRef = useRef<number | null>(null);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await cardService.getCards(
        selectedCategory === 'all' ? undefined : selectedCategory,
        searchQuery || undefined
      );
      setCards(data);
    } catch (error) {
      console.error('加载卡片失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await favoriteService.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('加载收藏失败:', error);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      loadCards();
    }, 100);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory, loadCards]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/card\/(.+)/);
      if (match) {
        setSelectedCardId(match[1]);
        setView('detail');
      } else {
        setView('list');
        setSelectedCardId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCardClick = (cardId: string) => {
    window.location.hash = `#/card/${cardId}`;
  };

  const handleBack = () => {
    window.location.hash = '';
  };

  const handleFavoriteToggle = async (cardId: string, isCurrentlyFavorite: boolean) => {
    try {
      if (isCurrentlyFavorite) {
        await favoriteService.removeFavorite(cardId);
        setFavorites((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        const card = await favoriteService.addFavorite(cardId);
        setFavorites((prev) => [...prev, card]);
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error);
    }
  };

  const handleFavoriteCardClick = (cardId: string) => {
    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCreateCard = async () => {
    if (!newCard.title || !newCard.content) {
      alert('请填写标题和内容');
      return;
    }
    try {
      const created = await cardService.createCard(newCard);
      setCards((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewCard({ title: '', category: '前端', content: '', difficulty: 3 });
    } catch (error) {
      console.error('创建卡片失败:', error);
    }
  };

  const handleCardUpdate = (updatedCard: Card) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
    setFavorites((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );
  };

  const handleCardDelete = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setFavorites((prev) => prev.filter((c) => c.id !== cardId));
  };

  return (
    <div className="app">
      <div className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="mobile-title">知识卡片</h1>
        <button
          className="mobile-create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="main-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h1 className="app-title">知识卡片</h1>
            <p className="app-subtitle">每天进步一点点</p>
          </div>

          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <button
            className="create-card-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            创建新卡片
          </button>

          <div className="sidebar-footer">
            <p className="card-count">
              共 <span>{cards.length}</span> 张卡片
            </p>
            <p className="fav-count">
              <svg viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {favorites.length} 个收藏
            </p>
          </div>
        </aside>

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="main-content">
          {view === 'list' ? (
            <CardList
              cards={cards}
              favorites={favorites}
              onCardClick={handleCardClick}
              onFavoriteToggle={handleFavoriteToggle}
              onFavoriteCardClick={handleFavoriteCardClick}
              isLoading={isLoading}
            />
          ) : (
            selectedCardId && (
              <CardDetail
                cardId={selectedCardId}
                onBack={handleBack}
                onCardUpdate={handleCardUpdate}
                onCardDelete={handleCardDelete}
              />
            )
          )}
        </main>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>创建新卡片</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={newCard.title}
                  onChange={(e) =>
                    setNewCard({ ...newCard, title: e.target.value })
                  }
                  placeholder="请输入卡片标题"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>分类</label>
                  <select
                    value={newCard.category}
                    onChange={(e) =>
                      setNewCard({ ...newCard, category: e.target.value })
                    }
                  >
                    <option value="前端">前端</option>
                    <option value="后端">后端</option>
                    <option value="工具">工具</option>
                    <option value="踩坑">踩坑</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>难度</label>
                  <div className="difficulty-picker">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= newCard.difficulty ? 'active' : ''}`}
                        onClick={() => setNewCard({ ...newCard, difficulty: star })}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={star <= newCard.difficulty ? '#f59e0b' : 'none'}
                          stroke={star <= newCard.difficulty ? '#f59e0b' : '#d1d5db'}
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>内容（支持 Markdown）</label>
                <textarea
                  value={newCard.content}
                  onChange={(e) =>
                    setNewCard({ ...newCard, content: e.target.value })
                  }
                  placeholder="支持 Markdown 格式..."
                  rows={8}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateCard}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
