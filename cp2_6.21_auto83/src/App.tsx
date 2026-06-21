import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import InstrumentList from './components/InstrumentList';
import InstrumentDetail from './components/InstrumentDetail';
import PublishForm from './components/PublishForm';
import './App.css';

interface Notification {
  id: string;
  type: 'success' | 'info';
  message: string;
}

interface AppContextType {
  showNotification: (type: 'success' | 'info', message: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  showFavoritesModal: boolean;
  setShowFavoritesModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const FAVORITES_KEY = 'instrument_favorites';

const loadFavorites = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveFavorites = (favorites: string[]) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // ignore
  }
};

function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const showNotification = useCallback((type: 'success' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(fid => fid !== id);
      }
      return [...prev, id];
    });
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  return (
    <AppContext.Provider value={{ showNotification, favorites, toggleFavorite, isFavorite, showFavoritesModal, setShowFavoritesModal }}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title" onClick={() => navigate('/')}>
              🎸 二手乐器市场
            </h1>
            <div className="header-actions">
              <button className="favorites-btn" onClick={() => setShowFavoritesModal(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444" className="favorites-icon">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                我的收藏
                {favorites.length > 0 && <span className="favorites-badge">{favorites.length}</span>}
              </button>
              <button className="publish-btn" onClick={() => navigate('/publish')}>
                + 发布乐器
              </button>
            </div>
          </div>
        </header>

        <div className="notification-container">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
            >
              {notification.message}
            </div>
          ))}
        </div>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<InstrumentList />} />
            <Route path="/instrument/:id" element={<InstrumentDetail />} />
            <Route path="/publish" element={<PublishForm />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>© 2024 二手乐器交易市场 - 让音乐传递价值</p>
        </footer>

        {showFavoritesModal && (
          <FavoritesModal
            onClose={() => setShowFavoritesModal(false)}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}

interface FavInstrument {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: '全新' | '9成新' | '8成新';
  price: number;
  images: string[];
  avgRating: number;
  evaluationCount: number;
}

function FavoritesModal({ onClose }: { onClose: () => void }) {
  const { favorites, toggleFavorite } = useApp();
  const navigate = useNavigate();
  const [favInstruments, setFavInstruments] = useState<FavInstrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/instruments');
        const allInstruments: FavInstrument[] = await res.json();
        const filtered = allInstruments.filter(i => favorites.includes(i.id));
        setFavInstruments(filtered);
      } catch (error) {
        console.error('Failed to fetch favorites:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [favorites]);

  const handleCardClick = (id: string) => {
    onClose();
    navigate(`/instrument/${id}`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">我的收藏</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">加载中...</div>
          ) : favInstruments.length === 0 ? (
            <div className="modal-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#D1D5FA">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <p>还没有收藏任何乐器</p>
            </div>
          ) : (
            <div className="favorites-grid">
              {favInstruments.map(instrument => (
                <div key={instrument.id} className="fav-card">
                  <div className="fav-card-image" onClick={() => handleCardClick(instrument.id)}>
                    <img src={instrument.images[0]} alt={instrument.name} />
                  </div>
                  <div className="fav-card-info" onClick={() => handleCardClick(instrument.id)}>
                    <h4 className="fav-card-title">{instrument.name}</h4>
                    <p className="fav-card-brand">{instrument.brand} · {instrument.category}</p>
                    <p className="fav-card-price">¥{instrument.price.toLocaleString()}</p>
                  </div>
                  <button
                    className="fav-card-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(instrument.id);
                    }}
                    title="取消收藏"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
