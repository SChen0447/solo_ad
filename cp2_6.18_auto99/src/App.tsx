import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Category } from './types';
import { getCards, createCard } from './services/cardService';
import { getFavorites, toggleFavorite } from './services/favoriteService';
import SearchFilter from './SearchFilter';
import CardList from './CardList';
import CardDetail from './CardDetail';
import CreateCardModal from './CreateCardModal';

const App: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [favorites, setFavorites] = useState<Card[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchTimeoutRef = useRef<number | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchCards = useCallback(async (cat: string, kw: string) => {
    try {
      const data = await getCards(cat === 'all' ? undefined : cat, kw || undefined);
      setCards(data);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchCards('all', ''), fetchFavorites()]);
      setLoading(false);
    };
    init();
  }, [fetchCards, fetchFavorites]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      fetchCards(category, keyword);
    }, 100);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [category, keyword, fetchCards]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
  };

  const handleKeywordChange = (kw: string) => {
    setKeyword(kw);
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const result = await toggleFavorite(id);
      setCards(prev => prev.map(card =>
        card.id === id ? { ...card, favorited: result.favorited } : card
      ));
      if (result.favorited) {
        const card = cards.find(c => c.id === id);
        if (card) {
          setFavorites(prev => [...prev, { ...card, favorited: true }]);
        }
      } else {
        setFavorites(prev => prev.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCardClick = (id: string) => {
    setSelectedCardId(id);
    window.history.pushState({}, '', `/card/${id}`);
  };

  const handleBack = () => {
    setSelectedCardId(null);
    window.history.pushState({}, '', '/');
  };

  const handleFavoriteClick = (id: string) => {
    setSidebarOpen(false);
    const element = document.getElementById(`card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('card-highlight');
      setTimeout(() => {
        element.classList.remove('card-highlight');
      }, 2000);
    }
  };

  const handleCreateCard = async (data: { title: string; category: Category; content: string; difficulty: number }) => {
    try {
      const newCard = await createCard(data);
      setCards(prev => [newCard, ...prev]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleCardDelete = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setFavorites(prev => prev.filter(c => c.id !== id));
  };

  const handleCardUpdate = (updatedCard: Card) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    if (updatedCard.favorited) {
      setFavorites(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    }
  };

  const filteredCards = useMemo(() => {
    let result = [...cards];
    if (category !== 'all') {
      result = result.filter(c => c.category === category);
    }
    if (keyword.trim()) {
      const lowerKw = keyword.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(lowerKw) ||
        c.content.toLowerCase().includes(lowerKw)
      );
    }
    return result;
  }, [cards, category, keyword]);

  if (selectedCardId) {
    return (
      <div className="app">
        <CardDetail
          cardId={selectedCardId}
          onBack={handleBack}
          onDelete={handleCardDelete}
          onUpdate={handleCardUpdate}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <button
        className={`hamburger-btn ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <SearchFilter
          category={category}
          keyword={keyword}
          onCategoryChange={handleCategoryChange}
          onKeywordChange={handleKeywordChange}
        />
        <button
          className="create-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建卡片
        </button>
      </aside>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="main-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : (
          <CardList
            cards={filteredCards}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onCardClick={handleCardClick}
            onFavoriteClick={handleFavoriteClick}
          />
        )}
      </main>

      <CreateCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCard}
      />
    </div>
  );
};

export default App;
