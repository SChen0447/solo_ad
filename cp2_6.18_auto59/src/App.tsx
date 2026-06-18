import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from './types';
import SearchFilter from './SearchFilter';
import CardList from './CardList';
import CardDetail from './CardDetail';
import CreateCardModal from './CreateCardModal';
import { cardService } from './services/cardService';
import { favoriteService } from './services/favoriteService';
import './App.css';

type View = 'home' | 'detail';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [cards, setCards] = useState<Card[]>([]);
  const [favorites, setFavorites] = useState<Card[]>([]);
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    try {
      const data = await cardService.getCards(category === 'all' ? undefined : category, keyword || undefined);
      setCards(data);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    }
  }, [category, keyword]);

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await favoriteService.getFavorites();
      setFavorites(data);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const [cardsData, favsData] = await Promise.all([
          cardService.getCards(),
          favoriteService.getFavorites()
        ]);
        setCards(cardsData);
        setFavorites(favsData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchCards();
    }
  }, [category, keyword, fetchCards, loading]);

  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setView('detail');
    window.history.pushState({}, '', `#/card/${cardId}`);
  };

  const handleBack = () => {
    setView('home');
    setSelectedCardId('');
    window.history.pushState({}, '', '#/');
  };

  const handleToggleFavorite = async (cardId: string) => {
    try {
      const isFavorited = favoriteIds.includes(cardId);
      if (isFavorited) {
        await favoriteService.removeFavorite(cardId);
      } else {
        await favoriteService.addFavorite(cardId);
      }
      fetchFavorites();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleCardCreated = (newCard: Card) => {
    setCards(prev => [newCard, ...prev]);
  };

  const handleCardDeleted = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    setFavorites(prev => prev.filter(c => c.id !== cardId));
    setView('home');
    setSelectedCardId('');
  };

  const handleCardUpdated = (updatedCard: Card) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    fetchFavorites();
  };

  return (
    <div className="app">
      {view === 'home' ? (
        <>
          <aside className="sidebar">
            <SearchFilter
              category={category}
              keyword={keyword}
              onCategoryChange={setCategory}
              onKeywordChange={setKeyword}
              onCreateCard={() => setIsCreateModalOpen(true)}
            />
          </aside>

          <main className="main-content">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>加载中...</p>
              </div>
            ) : (
              <CardList
                cards={cards}
                favorites={favorites}
                favoriteIds={favoriteIds}
                onCardClick={handleCardClick}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </main>
        </>
      ) : (
        <main className="detail-content">
          <CardDetail
            cardId={selectedCardId}
            allCards={cards}
            onBack={handleBack}
            onDelete={handleCardDeleted}
            onUpdate={handleCardUpdated}
          />
        </main>
      )}

      <CreateCardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCardCreated}
      />
    </div>
  );
};

export default App;
