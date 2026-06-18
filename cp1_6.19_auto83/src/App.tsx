import React from 'react';
import { useAppStore } from './stores/cardStore';
import CardGrid from './components/CardGrid';
import DeckEditor from './components/DeckEditor';
import BattleField from './components/BattleField';

const App: React.FC = () => {
  const { currentPage, setCurrentPage, cardsLoaded, playerDeck } = useAppStore();

  if (!cardsLoaded) {
    return (
      <div
        className="app-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #d4a14b, #fff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              fontFamily: 'Orbitron, sans-serif',
            }}
          >
            幻灵契约
          </div>
          <div style={{ opacity: 0.7 }}>正在加载幻灵图鉴...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <h1>幻灵契约</h1>
        <button
          className="btn-primary"
          onClick={() => setCurrentPage('codex')}
          style={{
            background:
              currentPage === 'codex'
                ? 'linear-gradient(135deg, #d4a14b, #b8860b)'
                : undefined,
          }}
        >
          📖 图鉴
        </button>
        <button
          className="btn-primary"
          onClick={() => setCurrentPage('deck')}
          style={{
            background:
              currentPage === 'deck'
                ? 'linear-gradient(135deg, #d4a14b, #b8860b)'
                : undefined,
          }}
        >
          🃏 卡组({playerDeck.length}/10)
        </button>
        <button
          className="btn-primary"
          onClick={() => setCurrentPage('battle')}
          style={{
            background:
              currentPage === 'battle'
                ? 'linear-gradient(135deg, #d4a14b, #b8860b)'
                : undefined,
          }}
        >
          ⚔️ 对战
        </button>
      </nav>

      <main style={{ paddingBottom: '40px' }}>
        {currentPage === 'codex' && <CardGrid />}
        {currentPage === 'deck' && <DeckEditor />}
        {currentPage === 'battle' && <BattleField />}
      </main>
    </div>
  );
};

export default App;
