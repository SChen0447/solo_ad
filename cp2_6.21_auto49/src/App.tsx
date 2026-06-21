import { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './GameCanvas';
import { Timer, StepCounter, RatingBadge, HistoryList, Button, RegeneratingNotice } from './ui';
import {
  generateSolvableMap,
  createInitialState,
  movePlayer,
  calculateRating,
  type GameState,
  type Direction,
  type LevelRecord,
  type Rating,
} from './gameLogic';

const TOTAL_TIME = 90;

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [level, setLevel] = useState(1);
  const [history, setHistory] = useState<LevelRecord[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [currentRating, setCurrentRating] = useState<Rating>('C');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [canvasSize, setCanvasSize] = useState(480);
  const [gameStatus, setGameStatus] = useState<'playing' | 'completed' | 'failed' | 'idle'>('idle');

  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startNewGame = useCallback(() => {
    setIsRegenerating(true);

    setTimeout(() => {
      const { map } = generateSolvableMap(8, 12);
      const newState = createInitialState(map);
      setGameState(newState);
      setTimeLeft(TOTAL_TIME);
      setShowRating(false);
      setGameStatus('playing');
      setIsRegenerating(false);
    }, 50);
  }, []);

  const restartLevel = useCallback(() => {
    if (!gameState) return;
    const newState = createInitialState(gameState.map);
    setGameState(newState);
    setTimeLeft(TOTAL_TIME);
    setShowRating(false);
    setGameStatus('playing');
  }, [gameState]);

  const skipLevel = useCallback(() => {
    setLevel(l => l + 1);
    startNewGame();
  }, [startNewGame]);

  const handleMove = useCallback((direction: Direction) => {
    if (!gameState || gameStatus !== 'playing') return;

    setGameState(prev => {
      if (!prev) return prev;
      const newState = movePlayer(prev, direction);
      return newState;
    });
  }, [gameState, gameStatus]);

  useEffect(() => {
    if (gameState?.isCompleted && gameStatus === 'playing') {
      const rating = calculateRating(timeLeft, gameState.steps, TOTAL_TIME);
      setCurrentRating(rating);
      setShowRating(true);
      setGameStatus('completed');

      const record: LevelRecord = {
        level,
        rating,
        steps: gameState.steps,
        timeLeft,
      };
      setHistory(prev => [record, ...prev]);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [gameState?.isCompleted, gameStatus, timeLeft, level]);

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing') return;

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        W: 'up',
        s: 'down',
        S: 'down',
        a: 'left',
        A: 'left',
        d: 'right',
        D: 'right',
      };

      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        handleMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, gameStatus]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const maxSize = Math.min(containerWidth - 40, 600);
      const size = Math.max(320, Math.min(maxSize, 600));
      setCanvasSize(size);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    startNewGame();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1E1E2E',
        color: '#CDD6F4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#CDD6F4' }}>
        迷宫解谜
      </h1>

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          gap: '24px',
          maxWidth: '900px',
          width: '100%',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'none' }}>
          <HistoryList records={history} />
        </div>

        <div style={{ display: history.length > 0 ? 'block' : 'none' }}>
          <HistoryList records={history} />
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 8px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Timer timeLeft={timeLeft} totalTime={TOTAL_TIME} />
              <span style={{ color: '#6B7280', fontSize: '14px' }}>
                第 {level} 关
              </span>
            </div>
            <StepCounter steps={gameState?.steps || 0} />
          </div>

          <div
            style={{
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            {gameState && (
              <GameCanvas gameState={gameState} canvasSize={canvasSize} />
            )}

            <RegeneratingNotice visible={isRegenerating} />

            <RatingBadge
              rating={currentRating}
              visible={showRating}
              onAnimationEnd={() => {}}
            />

            {gameStatus === 'failed' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(30, 30, 46, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                }}
              >
                <span style={{ fontSize: '24px', color: '#EF4444' }}>时间到！</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button onClick={restartLevel}>重新开始</Button>
                  <Button onClick={skipLevel}>跳过本关</Button>
                </div>
              </div>
            )}

            {gameStatus === 'completed' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '12px',
                  zIndex: 50,
                }}
              >
                <Button onClick={restartLevel}>重新开始</Button>
                <Button onClick={skipLevel}>下一关</Button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={restartLevel}>重新开始</Button>
            <Button onClick={skipLevel}>放弃本关</Button>
          </div>

          <div style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center' }}>
            使用 WASD 或 方向键 移动角色，收集钥匙打开门，到达绿色出口
          </div>
        </div>

        {history.length === 0 && (
          <div style={{ width: '180px', opacity: 0 }}>
            <HistoryList records={[]} />
          </div>
        )}
      </div>
    </div>
  );
}
