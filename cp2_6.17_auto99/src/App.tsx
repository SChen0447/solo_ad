import { useState, useEffect, useCallback } from 'react';
import InspirationGenerator from './components/InspirationGenerator';
import InspirationCollection from './components/InspirationCollection';

export interface InspirationItem {
  id: string;
  text: string;
  note: string;
  tags: string[];
  timestamp: number;
}

type View = 'home' | 'collection';

const App = () => {
  const [view, setView] = useState<View>('home');
  const [fade, setFade] = useState(true);
  const [collection, setCollection] = useState<InspirationItem[]>([]);

  const fetchCollection = useCallback(async () => {
    try {
      const res = await fetch('/api/inspiration/collection');
      if (res.ok) {
        const data = (await res.json()) as InspirationItem[];
        setCollection(data);
      }
    } catch (err) {
      console.error('获取收藏失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const switchView = (next: View) => {
    if (next === view) return;
    setFade(false);
    setTimeout(() => {
      setView(next);
      setFade(true);
    }, 300);
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body {
          background: #0f0f23;
          color: #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
        input, textarea, select { font-family: inherit; }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          background: rgba(15, 15, 35, 0.85);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .navbar-logo {
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, #a855f7 0%, #6b46c1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .navbar-links {
          display: flex;
          gap: 8px;
        }

        .nav-link {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #9ca3af;
          transition: all 0.3s ease;
        }
        .nav-link:hover {
          color: #e5e7eb;
          background: rgba(139, 92, 246, 0.15);
        }
        .nav-link.active {
          color: #fff;
          background: linear-gradient(135deg, #6b46c1 0%, #a855f7 100%);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .main-content {
          flex: 1;
          padding: 40px;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        .main-content.fade-out { opacity: 0; }

        @media (max-width: 768px) {
          .navbar {
            flex-direction: column;
            gap: 16px;
            padding: 16px 20px;
          }
          .navbar-links {
            width: 100%;
            flex-direction: column;
          }
          .nav-link { text-align: center; }
          .main-content { padding: 20px; }
        }
      `}</style>

      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-logo">💡 创意灵感簿</div>
          <div className="navbar-links">
            <button
              className={`nav-link ${view === 'home' ? 'active' : ''}`}
              onClick={() => switchView('home')}
            >
              首页
            </button>
            <button
              className={`nav-link ${view === 'collection' ? 'active' : ''}`}
              onClick={() => switchView('collection')}
            >
              收藏夹 <span style={{ opacity: 0.7 }}>({collection.length})</span>
            </button>
          </div>
        </nav>

        <main className={`main-content ${fade ? '' : 'fade-out'}`}>
          {view === 'home' && (
            <InspirationGenerator
              collection={collection}
              onCollectionChange={fetchCollection}
            />
          )}
          {view === 'collection' && (
            <InspirationCollection
              collection={collection}
              onCollectionChange={fetchCollection}
            />
          )}
        </main>
      </div>
    </>
  );
};

export default App;
