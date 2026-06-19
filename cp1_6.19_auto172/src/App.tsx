import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import { ScoreBoard } from './ScoreBoard';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    gameOver: false,
  });

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, handleStateChange);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
    };
  }, [handleStateChange]);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  }, []);

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    fontFamily: "'Courier New', monospace",
  };

  const titleStyle: React.CSSProperties = {
    color: '#ff5252',
    fontSize: '48px',
    textShadow: '0 0 16px rgba(255, 82, 82, 0.8)',
    marginBottom: '24px',
    letterSpacing: '4px',
  };

  const scoreStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '28px',
    textShadow: '0 0 8px rgba(255, 255, 255, 0.6)',
    marginBottom: '48px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '16px 48px',
    fontSize: '22px',
    fontFamily: "'Courier New', monospace",
    backgroundColor: '#1a237e',
    color: '#ffffff',
    border: '2px solid #4fc3f7',
    cursor: 'pointer',
    textShadow: '0 0 6px rgba(79, 195, 247, 0.8)',
    boxShadow: '0 0 16px rgba(79, 195, 247, 0.4)',
    transition: 'all 0.2s ease',
    letterSpacing: '2px',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'block',
        }}
      />
      <ScoreBoard score={gameState.score} lives={gameState.lives} />
      {gameState.gameOver && (
        <div style={overlayStyle}>
          <div style={titleStyle}>GAME OVER</div>
          <div style={scoreStyle}>FINAL SCORE: {gameState.score.toString().padStart(6, '0')}</div>
          <button
            style={buttonStyle}
            onClick={handleRestart}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#283593';
              e.currentTarget.style.boxShadow = '0 0 24px rgba(79, 195, 247, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1a237e';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(79, 195, 247, 0.4)';
            }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
