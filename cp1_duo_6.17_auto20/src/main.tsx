import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import BattlePage from './components/BattlePage';
import ScorePage from './components/ScorePage';
import './styles/styles.css';

type Page = 'menu' | 'battle' | 'score';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('menu');
  const [playerId] = useState(() => {
    let id = localStorage.getItem('rune_alchemy_player_id');
    if (!id) {
      id = 'player_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rune_alchemy_player_id', id);
    }
    return id;
  });

  useEffect(() => {
    const loadingElement = document.querySelector('.loading-container');
    if (loadingElement) {
      loadingElement.remove();
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'battle':
        return (
          <BattlePage
            playerId={playerId}
            onBack={() => setCurrentPage('menu')}
          />
        );
      case 'score':
        return (
          <ScorePage
            playerId={playerId}
            onBack={() => setCurrentPage('menu')}
          />
        );
      case 'menu':
      default:
        return (
          <div className="app-container">
            <div className="rune-corner top-left"></div>
            <div className="rune-corner top-right"></div>
            <div className="rune-corner bottom-left"></div>
            <div className="rune-corner bottom-right"></div>
            
            <div className="main-menu">
              <h1>符文炼金术</h1>
              <p className="subtitle">RUNE ALCHEMY</p>
              
              <div className="menu-buttons">
                <button
                  className="menu-button"
                  onClick={() => setCurrentPage('battle')}
                >
                  开始对战
                </button>
                <button
                  className="menu-button"
                  onClick={() => setCurrentPage('score')}
                >
                  战绩统计
                </button>
              </div>
              
              <div style={{
                position: 'absolute',
                bottom: '30px',
                fontSize: '0.85rem',
                color: '#6b5b4f',
                textAlign: 'center'
              }}>
                <p>选择你的符文，组合你的英雄，击败你的对手！</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  火焰🔥 → 自然🌿 → 雷电⚡ → 寒冰❄️ → 火焰🔥
                </p>
                <p style={{ fontSize: '0.75rem' }}>
                  光明✨ ⇄ 暗影🌑
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container parchment-texture">
      {renderPage()}
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
