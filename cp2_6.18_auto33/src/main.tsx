import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapGenerator } from './modules/gameMap/MapGenerator';
import { gameStore } from './modules/gameState/GameStore';
import { unitBehavior } from './modules/ai/UnitBehavior';
import { eventBus } from './eventBus';
import GameCanvas from './components/GameCanvas';
import UIPanel from './components/UIPanel';
import { GameState } from './modules/gameMap/types';
import './index.css';

function StatusBar() {
  const [state, setState] = useState<GameState>(gameStore.getState());

  useEffect(() => {
    const unsub = gameStore.subscribe(setState);
    return unsub;
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 40,
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 200,
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      <span style={{ color: '#ffffff', fontSize: 12, fontFamily: "'Segoe UI', sans-serif" }}>
        FPS: {state.fps}
      </span>
      <span style={{ color: '#ffffff', fontSize: 12, fontFamily: "'Segoe UI', sans-serif" }}>
        选中单位: {state.selectedUnitIds.length}
      </span>
    </div>
  );
}

function App() {
  useEffect(() => {
    const gen = new MapGenerator(Date.now());
    const { tiles } = gen.generate();

    unitBehavior.init();
    unitBehavior.setTiles(tiles);
    unitBehavior.setUnits(gameStore.getState().units);

    eventBus.emit('state:init', {
      units: gameStore.getState().units,
      tiles
    });

    return () => {
      eventBus.clear();
    };
  }, []);

  return (
    <StrictMode>
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a2e',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <StatusBar />
        <div style={{ flex: 1, marginTop: 40, position: 'relative' }}>
          <GameCanvas />
        </div>
        <UIPanel />
      </div>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
