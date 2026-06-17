import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GameBoard } from '../game/GameBoard';
import { GameRenderer } from '../ui/GameRenderer';
import { InputManager } from '../ui/InputManager';
import { UIPanel } from '../ui/UIPanel';
import type { LevelData, GameState, Position, ToolType } from '../game/types';

const defaultLevel: LevelData = {
  id: 1,
  name: '光之入门',
  size: 12,
  walls: [],
  lightSources: [],
  targets: [],
  boxes: [],
  player: { x: 1, y: 1 },
  mirrors: 3,
  prisms: 2,
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const rafRef = useRef<number>(0);
  const lastWinRef = useRef<boolean>(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [levelName, setLevelName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [joystickDrag, setJoystickDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initGame = useCallback(async (levelId: number, lives?: number) => {
    setLoading(true);
    setLoadError(false);
    try {
      let level = await GameBoard.fetchLevel(levelId);
      if (!level) {
        level = defaultLevel;
        setLoadError(true);
      }
      setLevelName(level.name);

      const engine = new GameEngine(level);
      if (lives !== undefined) {
        engine.state.player.lives = lives;
      }
      engine.onStateChange = (s) => setGameState({ ...s });
      engineRef.current = engine;
      setGameState({ ...engine.state });
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initGame(1);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initGame]);

  useEffect(() => {
    if (!canvasRef.current || !engineRef.current || !gameState) return;
    if (rendererRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new GameRenderer(canvas);
    renderer.resize(gameState.gridSize);
    rendererRef.current = renderer;

    const input = new InputManager(engineRef.current, {
      onPlace: (pos: Position) => engineRef.current?.placeTool(pos),
      onRemove: (pos: Position) => engineRef.current?.removeTool(pos),
      onCanvasReady: () => {},
    });
    input.attach(canvas, renderer);
    inputRef.current = input;

    const animate = () => {
      if (rendererRef.current && engineRef.current) {
        rendererRef.current.render(engineRef.current.state);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      input.detach();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState?.levelId]);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.isWin && !lastWinRef.current && rendererRef.current) {
      rendererRef.current.spawnWinParticles(gameState);
      lastWinRef.current = true;
      GameBoard.saveProgress({ completedLevel: gameState.levelId });
    }
    if (!gameState.isWin) {
      lastWinRef.current = false;
    }
  }, [gameState?.isWin, gameState]);

  const handleNextLevel = useCallback(() => {
    if (!gameState) return;
    const nextId = gameState.levelId + 1;
    initGame(nextId, gameState.player.lives);
  }, [gameState, initGame]);

  const handleRetry = useCallback(() => {
    engineRef.current?.resetLevel();
  }, []);

  const handleRestart = useCallback(() => {
    if (!gameState) return;
    initGame(gameState.levelId, 5);
  }, [gameState, initGame]);

  const handleSelectTool = useCallback((tool: ToolType) => {
    engineRef.current?.selectTool(tool);
  }, []);

  const handleRotateMirror = useCallback(() => {
    engineRef.current?.rotateMirror();
  }, []);

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx);
    const clampedDx = Math.cos(angle) * dist;
    const clampedDy = Math.sin(angle) * dist;
    setJoystickDrag({ dx: clampedDx, dy: clampedDy });
    if (inputRef.current) {
      inputRef.current.handleJoystickMove(dx, dy);
    }
  };

  const handleJoystickEnd = () => {
    setJoystickDrag(null);
    if (inputRef.current) {
      inputRef.current.lastDir = null;
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ color: '#fff', fontSize: '20px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {loadError && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            color: '#ff8888',
            fontSize: '13px',
            padding: '8px 12px',
            background: 'rgba(255,50,50,0.15)',
            borderRadius: 6,
            zIndex: 100,
          }}
        >
          ⚠️ 无法连接后端API，使用本地默认关卡数据 (请运行 server/api.py)
        </div>
      )}

      <div style={canvasWrapperStyle}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: 8,
            boxShadow: '0 0 30px rgba(50, 80, 150, 0.3)',
          }}
        />

        {gameState && (
          <UIPanel
            state={gameState}
            levelName={levelName}
            onNextLevel={handleNextLevel}
            onRetry={handleRetry}
            onRestart={handleRestart}
            onSelectTool={handleSelectTool}
            onRotateMirror={handleRotateMirror}
          />
        )}

        {isMobile && gameState && !gameState.isWin && !gameState.isGameOver && (
          <MobileControls
            joystickDrag={joystickDrag}
            onStart={handleJoystickStart}
            onMove={handleJoystickMove}
            onEnd={handleJoystickEnd}
            onSelectMirror={() => handleSelectTool(gameState.selectedTool === 'mirror' ? null : 'mirror')}
            onSelectPrism={() => handleSelectTool(gameState.selectedTool === 'prism' ? null : 'prism')}
            onRotate={handleRotateMirror}
            state={gameState}
          />
        )}
      </div>
    </div>
  );
};

interface MobileControlsProps {
  joystickDrag: { dx: number; dy: number } | null;
  onStart: (e: React.TouchEvent | React.MouseEvent) => void;
  onMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onEnd: () => void;
  onSelectMirror: () => void;
  onSelectPrism: () => void;
  onRotate: () => void;
  state: GameState;
}

const MobileControls: React.FC<MobileControlsProps> = ({
  joystickDrag,
  onStart,
  onMove,
  onEnd,
  onSelectMirror,
  onSelectPrism,
  onRotate,
  state,
}) => {
  const knobX = joystickDrag?.dx ?? 0;
  const knobY = joystickDrag?.dy ?? 0;

  return (
    <>
      <div
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onMouseDown={onStart}
        onMouseMove={(e) => e.buttons === 1 && onMove(e)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(20, 20, 40, 0.7)',
          border: '1px solid rgba(255,255,255,0.2)',
          touchAction: 'none',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'rgba(100, 150, 255, 0.6)',
            transform: `translate(${knobX}px, ${knobY}px)`,
            boxShadow: '0 0 12px rgba(100,150,255,0.5)',
            transition: joystickDrag ? 'none' : 'transform 0.15s',
          }}
        />
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', position: 'absolute', top: '4px' }}>↑</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', position: 'absolute', bottom: '4px' }}>↓</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', position: 'absolute', left: '6px' }}>←</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', position: 'absolute', right: '6px' }}>→</div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <MobileButton
          icon="◆"
          label={`镜 x${state.inventoryMirrors}`}
          active={state.selectedTool === 'mirror'}
          onClick={onSelectMirror}
          onLongPress={state.selectedTool === 'mirror' ? onRotate : undefined}
        />
        <MobileButton
          icon="▲"
          label={`棱 x${state.inventoryPrisms}`}
          active={state.selectedTool === 'prism'}
          onClick={onSelectPrism}
        />
      </div>
    </>
  );
};

interface MobileButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  onLongPress?: () => void;
}

const MobileButton: React.FC<MobileButtonProps> = ({ icon, label, active, onClick, onLongPress }) => {
  const longPressRef = useRef<number | null>(null);
  return (
    <div
      onClick={onClick}
      onTouchStart={() => {
        if (onLongPress) {
          longPressRef.current = window.setTimeout(onLongPress, 400);
        }
      }}
      onTouchEnd={() => {
        if (longPressRef.current) {
          clearTimeout(longPressRef.current);
          longPressRef.current = null;
        }
      }}
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: active
          ? 'rgba(100, 150, 255, 0.5)'
          : 'rgba(20, 20, 40, 0.7)',
        border: `1px solid ${active ? 'rgba(150,200,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: '9px', marginTop: '2px', opacity: 0.8 }}>{label}</span>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  background: 'linear-gradient(135deg, #0a0b18 0%, #12142a 50%, #0a0b18 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
};

const canvasWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  maxWidth: '100%',
  maxHeight: '100%',
  padding: '16px',
  boxSizing: 'border-box',
};
