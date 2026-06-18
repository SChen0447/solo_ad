import { useState, useEffect } from 'react';
import SceneRenderer from './ui/SceneRenderer';
import BlessingPanel from './ui/BlessingPanel';
import StatsPanel from './ui/StatsPanel';
import { useGameStore } from './store/gameStore';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const initGame = useGameStore((s) => s.initGame);

  useEffect(() => {
    initGame();

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [initGame]);

  return (
    <div className="app-container">
      <div className="stats-position">
        <StatsPanel />
      </div>

      {isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={() => setPanelOpen(true)}
        >
          ☰ 祝福
        </button>
      )}

      <div className="main-content">
        {!isMobile && (
          <div className="panel-wrapper">
            <BlessingPanel isOpen={true} />
          </div>
        )}

        <div className="scene-wrapper">
          <SceneRenderer />
        </div>
      </div>

      {isMobile && (
        <>
          <BlessingPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
          {panelOpen && (
            <div
              className="panel-overlay"
              onClick={() => setPanelOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
