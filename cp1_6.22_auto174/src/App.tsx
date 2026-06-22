import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameLoop, CombatEvent } from './game/GameLoop';
import { HealthBar } from './ui/HealthBar';
import { CombatLog } from './combat/CombatLog';
import { getLevelConfig } from './services/api';
import { PLAYER_CONFIG } from './player/PlayerController';

interface GameStateUI {
  playerHealth: number;
  playerMaxHealth: number;
  comboCount: number;
  comboScale: number;
  showVictory: boolean;
  levelComplete: boolean;
  gameOver: boolean;
  currentWave: number;
  totalWaves: number;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [combatEvents, setCombatEvents] = useState<CombatEvent[]>([]);
  const [gameState, setGameState] = useState<GameStateUI>({
    playerHealth: PLAYER_CONFIG.maxHealth,
    playerMaxHealth: PLAYER_CONFIG.maxHealth,
    comboCount: 0,
    comboScale: 1,
    showVictory: false,
    levelComplete: false,
    gameOver: false,
    currentWave: 1,
    totalWaves: 0
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 360 });

  const loadLevel = useCallback(async (levelId: number) => {
    setIsLoading(true);
    try {
      const data = await getLevelConfig(levelId);
      if (gameLoopRef.current) {
        gameLoopRef.current.setLevelData(data);
        gameLoopRef.current.reset();
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load level:', error);
      setIsLoading(false);
    }
  }, []);

  const calculateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const targetRatio = 16 / 9;
    let width = containerWidth;
    let height = width / targetRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = height * targetRatio;
    }

    width = Math.max(320, Math.min(1280, width));
    height = Math.max(180, Math.min(720, height));

    width = Math.round(width);
    height = Math.round(height);

    setCanvasSize({ width, height });
  }, []);

  useEffect(() => {
    calculateCanvasSize();
    window.addEventListener('resize', calculateCanvasSize);
    return () => window.removeEventListener('resize', calculateCanvasSize);
  }, [calculateCanvasSize]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = PLAYER_CONFIG.canvasWidth;
    canvas.height = PLAYER_CONFIG.canvasHeight;

    const gameLoop = new GameLoop(canvas);
    gameLoopRef.current = gameLoop;

    gameLoop.setOnCombatEventCallback((events) => {
      setCombatEvents(events);
    });

    gameLoop.setOnStateChangeCallback((state) => {
      setGameState(state);
    });

    loadLevel(currentLevel).then(() => {
      gameLoop.start();
    });

    return () => {
      gameLoop.destroy();
    };
  }, []);

  useEffect(() => {
    if (gameState.levelComplete && !isLoading) {
      const nextLevel = currentLevel + 1;
      if (nextLevel <= 3) {
        setCurrentLevel(nextLevel);
        loadLevel(nextLevel);
      }
    }
  }, [gameState.levelComplete, currentLevel, isLoading, loadLevel]);

  const handleRestart = () => {
    if (gameLoopRef.current) {
      gameLoopRef.current.reset();
      loadLevel(currentLevel);
    }
  };

  const scaleX = canvasSize.width / PLAYER_CONFIG.canvasWidth;
  const scaleY = canvasSize.height / PLAYER_CONFIG.canvasHeight;

  return (
    <div style={styles.appContainer}>
      <div ref={containerRef} style={styles.gameContainer}>
        <div
          style={{
            ...styles.canvasWrapper,
            width: canvasSize.width,
            height: canvasSize.height
          }}
        >
          <div
            style={{
              ...styles.pillar,
              left: -((window.innerWidth - canvasSize.width) / 2),
              width: (window.innerWidth - canvasSize.width) / 2
            }}
          />
          <div
            style={{
              ...styles.pillar,
              right: -((window.innerWidth - canvasSize.width) / 2),
              width: (window.innerWidth - canvasSize.width) / 2
            }}
          />

          <canvas
            ref={canvasRef}
            style={{
              ...styles.canvas,
              width: canvasSize.width,
              height: canvasSize.height
            }}
          />

          <div
            style={{
              ...styles.uiOverlay,
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${scaleX}, ${scaleY})`,
              transformOrigin: 'top left'
            }}
          >
            <HealthBar
              currentHealth={gameState.playerHealth}
              maxHealth={gameState.playerMaxHealth}
              comboCount={gameState.comboCount}
              comboScale={gameState.comboScale}
            />
            <CombatLog events={combatEvents} />

            <div style={styles.waveIndicator}>
              <span style={styles.waveText}>
                WAVE {gameState.currentWave} / {gameState.totalWaves}
              </span>
            </div>

            {isLoading && (
              <div style={styles.loadingOverlay}>
                <div style={styles.loadingText}>LOADING LEVEL {currentLevel}...</div>
              </div>
            )}

            {gameState.gameOver && (
              <div style={styles.gameOverOverlay}>
                <div style={styles.gameOverText}>GAME OVER</div>
                <button style={styles.restartButton} onClick={handleRestart}>
                  RETRY
                </button>
              </div>
            )}

            {gameState.levelComplete && currentLevel > 3 && (
              <div style={styles.gameCompleteOverlay}>
                <div style={styles.gameCompleteText}>ALL LEVELS COMPLETE!</div>
                <button style={styles.restartButton} onClick={handleRestart}>
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.controlsInfo}>
        <span style={styles.controlsText}>
          A/D: MOVE | J: ATTACK | K: JUMP | JJJ: COMBO
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0a0a0f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  gameContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  canvasWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#0a0a0f',
    zIndex: 100
  },
  canvas: {
    imageRendering: 'pixelated',
    display: 'block'
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none'
  },
  waveIndicator: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '6px 16px',
    borderRadius: 4,
    pointerEvents: 'none'
  },
  waveText: {
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e2e8f0',
    letterSpacing: '2px'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },
  loadingText: {
    fontFamily: 'monospace',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffd700'
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    zIndex: 100,
    pointerEvents: 'auto'
  },
  gameOverText: {
    fontFamily: 'monospace',
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#ef4444',
    textShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
  },
  gameCompleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    zIndex: 100,
    pointerEvents: 'auto'
  },
  gameCompleteText: {
    fontFamily: 'monospace',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
  },
  restartButton: {
    fontFamily: 'monospace',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#ef4444',
    border: 'none',
    padding: '12px 32px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '2px'
  },
  controlsInfo: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '8px 24px',
    borderRadius: 4,
    pointerEvents: 'none'
  },
  controlsText: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#94a3b8',
    letterSpacing: '1px'
  }
};

export default App;
