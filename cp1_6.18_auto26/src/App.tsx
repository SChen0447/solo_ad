import { useRef, useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import StoryPanel from './components/StoryPanel';
import { Game } from './game';
import { GameState } from './game/entities';

export default function App() {
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState({ ...state });
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: '#05051a',
        overflow: 'hidden',
      }}
    >
      <GameCanvas onStateUpdate={handleStateUpdate} gameRef={gameRef} />
      {gameState && <HUD state={gameState} />}
      <StoryPanel story={gameState?.pendingStory ?? null} gameRef={gameRef} />
    </div>
  );
}
