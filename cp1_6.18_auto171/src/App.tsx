import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useDataStore } from './dataStore';
import CreativeCard from './components/CreativeCard';
import Leaderboard from './components/Leaderboard';
import CreativeForm from './components/CreativeForm';
import CategoryFilter from './components/CategoryFilter';
import CreativeDetail from './components/CreativeDetail';

const HomePage: React.FC = function HomePage() {
  const navigate = useNavigate();
  const [filterTransition, setFilterTransition] = useState(false);
  const [newCreativeIds, setNewCreativeIds] = useState<Set<string>>(new Set());

  const getCreativesByCategory = useDataStore((state) => state.getCreativesByCategory);
  const toggleVote = useDataStore((state) => state.toggleVote);
  const hasVoted = useDataStore((state) => state.hasVoted);
  const currentUserId = useDataStore((state) => state.currentUserId);
  const category = useDataStore((state) => state.category);
  const creatives = useDataStore((state) => state.creatives);

  const filteredCreatives = getCreativesByCategory();

  useEffect(() => {
    const unsubscribe = useDataStore.subscribe((state) => {
      if (state.creatives.length > creatives.length) {
        const newCreative = state.creatives[0];
        setNewCreativeIds((prev) => new Set([...prev, newCreative.id]));
        setTimeout(() => {
          setNewCreativeIds((prev) => {
            const next = new Set(prev);
            next.delete(newCreative.id);
            return next;
          });
        }, 400);
      }
    });
    return unsubscribe;
  }, [creatives.length]);

  useEffect(() => {
    setFilterTransition(true);
    const timer = setTimeout(() => setFilterTransition(false), 200);
    return () => clearTimeout(timer);
  }, [category]);

  const handleCardClick = (creativeId: string) => {
    navigate(`/creative/${creativeId}`);
  };

  const handleLeaderboardClick = (creativeId: string) => {
    navigate(`/creative/${creativeId}`);
  };

  const handleVote = (creativeId: string) => {
    toggleVote(creativeId, currentUserId);
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="logo-icon">💡</span>
            创意众包
          </h1>
          <p className="app-subtitle">分享灵感，投票创意</p>
        </div>
      </header>

      <main className="main-content">
        <div className="content-wrapper">
          <div className="creatives-section">
            <div className="section-header">
              <CreativeForm />
              <CategoryFilter />
            </div>

            <div
              className={`creatives-grid ${filterTransition ? 'fade-transition' : ''}`}
            >
              {filteredCreatives.map((creative, index) => (
                <CreativeCard
                  key={creative.id}
                  creative={creative}
                  onVote={() => handleVote(creative.id)}
                  hasVoted={hasVoted(creative.id, currentUserId)}
                  onClick={() => handleCardClick(creative.id)}
                  isNew={newCreativeIds.has(creative.id)}
                  index={index}
                />
              ))}
            </div>

            {filteredCreatives.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>该分类下暂无创意，来发布第一个吧！</p>
              </div>
            )}
          </div>

          <aside className="sidebar">
            <div className="sidebar-sticky">
              <Leaderboard onItemClick={handleLeaderboardClick} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/creative/:id" element={<CreativeDetail />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
