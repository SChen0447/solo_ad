import React from 'react';
import PoemFall from './PoemFall';
import MusicPlayer from './MusicPlayer';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">古韵诗画</h1>
        <p className="app-subtitle">—— 水墨之间 · 诗意流淌 ——</p>
      </header>

      <main className="app-main">
        <PoemFall />
      </main>

      <MusicPlayer />

      <style>{`
        .app-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background-color: #2E1A11;
        }

        .app-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          text-align: center;
          padding: 20px 0;
          background: linear-gradient(
            180deg,
            rgba(46, 26, 17, 0.9) 0%,
            rgba(46, 26, 17, 0) 100%
          );
          pointer-events: none;
        }

        .app-title {
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 42px;
          color: #FAF0E6;
          letter-spacing: 12px;
          margin-bottom: 8px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .app-subtitle {
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 16px;
          color: #D7CCC8;
          letter-spacing: 6px;
          opacity: 0.8;
        }

        .app-main {
          position: relative;
          width: 100%;
          min-height: 100vh;
        }

        @media (max-width: 768px) {
          .app-title {
            font-size: 32px;
            letter-spacing: 8px;
          }

          .app-subtitle {
            font-size: 14px;
            letter-spacing: 4px;
          }
        }

        @media (max-width: 480px) {
          .app-header {
            padding: 16px 0;
          }

          .app-title {
            font-size: 24px;
            letter-spacing: 6px;
          }

          .app-subtitle {
            font-size: 12px;
            letter-spacing: 3px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
