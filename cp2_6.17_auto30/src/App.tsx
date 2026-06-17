import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameStats } from './game/GameEngine';
import { BulletConfig } from './game/Player';
import BulletEditor from './components/BulletEditor';

type GameState = 'menu' | 'playing' | 'editor' | 'gameover';

const DEFAULT_BULLET_CONFIG: BulletConfig = {
  shape: 'circle',
  angle: 0,
  count: 1,
  color: '#00ff88'
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [bulletConfig, setBulletConfig] = useState<BulletConfig>(DEFAULT_BULLET_CONFIG);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    enemiesDestroyed: 0,
    lives: 3,
    gameOver: false,
    waveNumber: 0
  });
  const [showEditor, setShowEditor] = useState(true);

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;
    if (engineRef.current) {
      engineRef.current.stop();
    }
    const engine = new GameEngine(canvasRef.current, { ...bulletConfig });
    engine.onStatsChange = (newStats) => {
      setStats({ ...newStats });
      if (newStats.gameOver) {
        setGameState('gameover');
      }
    };
    engineRef.current = engine;
  }, [bulletConfig]);

  useEffect(() => {
    if (gameState === 'playing' || gameState === 'editor') {
      initEngine();
      return () => {
        if (engineRef.current) {
          engineRef.current.stop();
        }
      };
    }
  }, [gameState, initEngine]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBulletConfig({ ...bulletConfig });
    }
  }, [bulletConfig]);

  useEffect(() => {
    if ((gameState === 'playing' || gameState === 'editor') && engineRef.current && !engineRef.current.running) {
      engineRef.current.start();
    }
  }, [gameState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current.setMousePosition(x, y);
  }, []);

  const startGame = () => {
    setBulletConfig(DEFAULT_BULLET_CONFIG);
    setStats({ score: 0, enemiesDestroyed: 0, lives: 3, gameOver: false, waveNumber: 0 });
    setShowEditor(true);
    setGameState('playing');
  };

  const restartGame = () => {
    setStats({ score: 0, enemiesDestroyed: 0, lives: 3, gameOver: false, waveNumber: 0 });
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
    setShowEditor(true);
    setGameState('playing');
  };

  const goToEditor = () => {
    setStats({ score: 0, enemiesDestroyed: 0, lives: 3, gameOver: false, waveNumber: 0 });
    setShowEditor(true);
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
    setGameState('editor');
  };

  const resetBulletConfig = () => {
    setBulletConfig(DEFAULT_BULLET_CONFIG);
  };

  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };

  const buttonStyle: React.CSSProperties = {
    width: 140,
    height: 44,
    borderRadius: 8,
    background: '#00ff88',
    border: 'none',
    color: '#0a0a2e',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    boxShadow: '0 0 12px rgba(0, 255, 136, 0.6)',
    letterSpacing: 1
  };

  const buttonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#00cc66';
    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.9)';
  };

  const buttonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#00ff88';
    e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 136, 0.6)';
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a2e',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 800,
          height: 600
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseMove={handleMouseMove}
          style={{
            display: 'block',
            borderRadius: 8,
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
            cursor: gameState === 'playing' || gameState === 'editor' ? 'none' : 'default'
          }}
        />

        {(gameState === 'playing' || gameState === 'editor') && (
          <BulletEditor
            config={bulletConfig}
            onChange={setBulletConfig}
            onReset={resetBulletConfig}
            visible={showEditor}
          />
        )}

        {(gameState === 'playing' || gameState === 'editor') && (
          <button
            onClick={toggleEditor}
            style={{
              position: 'absolute',
              top: 20,
              right: showEditor ? 320 : 20,
              padding: '8px 14px',
              background: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid #00ffff',
              borderRadius: 8,
              color: '#00ffff',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
              textShadow: '0 0 6px rgba(0, 255, 255, 0.6)',
              boxShadow: '0 0 8px rgba(0, 255, 255, 0.3)'
            }}
          >
            {showEditor ? '▸ 隐藏编辑器' : '◂ 显示编辑器'}
          </button>
        )}

        {gameState === 'menu' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 10, 46, 0.95)',
              borderRadius: 8,
              transition: 'all 0.3s ease-out'
            }}
          >
            <h1
              style={{
                color: '#00ffff',
                fontFamily: 'monospace',
                fontSize: 42,
                marginBottom: 8,
                textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
                letterSpacing: 4
              }}
            >
              ◆ 弹幕射击 ◆
            </h1>
            <h2
              style={{
                color: '#00ff88',
                fontFamily: 'monospace',
                fontSize: 18,
                marginBottom: 60,
                textShadow: '0 0 10px rgba(0, 255, 136, 0.6)',
                letterSpacing: 2,
                fontWeight: 'normal'
              }}
            >
              BULLET HELL EDITOR
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <button
                style={buttonStyle}
                onMouseEnter={buttonHover}
                onMouseLeave={buttonLeave}
                onClick={startGame}
              >
                ▶ 开始游戏
              </button>
              <button
                style={buttonStyle}
                onMouseEnter={buttonHover}
                onMouseLeave={buttonLeave}
                onClick={goToEditor}
              >
                ⚙ 子弹编辑器
              </button>
            </div>

            <p
              style={{
                position: 'absolute',
                bottom: 30,
                color: '#555',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: 1
              }}
            >
              移动鼠标控制战机 · 自动发射 · 自定义弹幕
            </p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.67)',
              borderRadius: 8,
              transition: 'all 0.3s ease-out'
            }}
          >
            <h2
              style={{
                color: '#ff3366',
                fontFamily: 'monospace',
                fontSize: 36,
                marginBottom: 40,
                textShadow: '0 0 16px rgba(255, 51, 102, 0.8)',
                letterSpacing: 4
              }}
            >
              ◆ GAME OVER ◆
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40, alignItems: 'center' }}>
              <div
                style={{
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: 22,
                  textShadow: '0 0 8px rgba(0, 255, 255, 0.5)'
                }}
              >
                最终得分: <span style={{ color: '#00ffff' }}>{stats.score}</span>
              </div>
              <div
                style={{
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: 18,
                  textShadow: '0 0 6px rgba(0, 255, 136, 0.5)'
                }}
              >
                击落敌机: <span style={{ color: '#00ff88' }}>{stats.enemiesDestroyed}</span>
              </div>
              <div
                style={{
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: 18,
                  textShadow: '0 0 6px rgba(204, 102, 255, 0.5)'
                }}
              >
                到达波次: <span style={{ color: '#cc66ff' }}>{stats.waveNumber}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
              <button
                style={buttonStyle}
                onMouseEnter={buttonHover}
                onMouseLeave={buttonLeave}
                onClick={restartGame}
              >
                ↻ 重新开始
              </button>
              <button
                style={buttonStyle}
                onMouseEnter={buttonHover}
                onMouseLeave={buttonLeave}
                onClick={goToEditor}
              >
                ⚙ 返回编辑器
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
