import React, { lazy, Suspense } from 'react';
import { useApp } from './context/AppContext';

const ColorChallenge = lazy(() => import('./components/ColorChallenge'));
const EmotionPicker = lazy(() => import('./components/EmotionPicker'));
const MoodCalendar = lazy(() => import('./components/MoodCalendar'));

const App: React.FC = () => {
  const { currentPage, setCurrentPage, user } = useApp();

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <button
          className={`nav-btn ${currentPage === 'challenge' ? 'active' : ''}`}
          onClick={() => setCurrentPage('challenge')}
        >
          🎨 配色挑战
        </button>
        <button
          className={`nav-btn ${currentPage === 'emotion' ? 'active' : ''}`}
          onClick={() => setCurrentPage('emotion')}
        >
          😊 情绪记录
        </button>
        <button
          className={`nav-btn ${currentPage === 'calendar' ? 'active' : ''}`}
          onClick={() => setCurrentPage('calendar')}
        >
          📅 情绪色谱
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', fontSize: '14px', color: '#A29BFE' }}>
          总分: <strong style={{ color: '#FDCB6E', marginLeft: '6px' }}>{user.totalScore}</strong>
        </div>
      </nav>

      <div className="page-content">
        <Suspense fallback={<div className="empty-state"><div className="empty-state-emoji">⏳</div>加载中...</div>}>
          {currentPage === 'challenge' && <ColorChallenge />}
          {currentPage === 'emotion' && <EmotionPicker />}
          {currentPage === 'calendar' && <MoodCalendar />}
        </Suspense>
      </div>
    </div>
  );
};

export default App;
