import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, EngineFrameState } from './GameEngine';
import { GameRenderer } from './GameRenderer';

interface GameUIProps {}

const GameUI: React.FC<GameUIProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const [engineState, setEngineState] = useState<EngineFrameState | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;
    let mounted = true;
    engine.init().then(() => {
      if (!mounted || !canvasRef.current) return;
      const renderer = new GameRenderer(canvasRef.current);
      rendererRef.current = renderer;
      setLoading(false);
      engine.onFrame((state) => {
        setEngineState(state);
      });
      const loop = (now: number) => {
        if (!rendererRef.current || !engineRef.current) return;
        const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
        lastFrameRef.current = now;
        const latestState = {
          gameState: engineRef.current.getState(),
          player: engineRef.current['player'],
          obstacles: engineRef.current['obstacles'].getObstacles(),
          score: engineRef.current.getScoreManager().getState(),
          currentTime: engineRef.current['currentTime'],
          currentBeat: engineRef.current['currentBeat'],
          lastBeat: engineRef.current['lastBeat'],
          flash: engineRef.current['flash'],
          flashColor: engineRef.current['flashColor'],
          screenShake: engineRef.current['screenShake'],
          comboPulse: engineRef.current['comboPulse'],
          result: engineRef.current['result'],
          perfectFlash: engineRef.current['perfectFlash'],
          crashFlash: engineRef.current['crashFlash'],
          crashParticles: engineRef.current['crashParticles'],
        } as EngineFrameState;
        rendererRef.current.render(latestState, dt);
        rafRef.current = requestAnimationFrame(loop);
      };
      lastFrameRef.current = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) rendererRef.current.destroy();
      engine.destroy();
    };
  }, []);

  useEffect(() => {
    if (!engineState) return;
    setDisplayScore((prev) => {
      const diff = engineState.score.score - prev;
      if (Math.abs(diff) < 1) return engineState.score.score;
      return prev + diff * 0.2;
    });
  }, [engineState]);

  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) rendererRef.current.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!engineRef.current) return;
    if (e.key === ' ' || e.key.toLowerCase() === 's') {
      e.preventDefault();
      engineRef.current.handleKeyDown(e.key);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!engineRef.current) return;
    if (e.key === ' ' || e.key.toLowerCase() === 's') {
      e.preventDefault();
      engineRef.current.handleKeyUp(e.key);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleStart = () => {
    engineRef.current?.start();
  };

  const handlePause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.getState() === 'playing') engine.pause();
    else if (engine.getState() === 'paused') engine.resume();
  };

  const handleRestart = () => {
    engineRef.current?.start();
  };

  const gameState = engineState?.gameState ?? 'idle';
  const bestScore = engineRef.current?.getScoreManager().getBest() ?? 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: 'linear-gradient(135deg, #0a0e2a 0%, #05071a 100%)',
      }}
    >
      <div
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        {gameState === 'idle' && !loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(5, 7, 26, 0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h1
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  background: 'linear-gradient(90deg, #66ccff, #aa88ff, #ff8866)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 8,
                  letterSpacing: 4,
                }}
              >
                节拍跑酷者
              </h1>
              <p style={{ color: '#8899bb', fontSize: 16, letterSpacing: 2 }}>
                跟随节拍，翻越障碍
              </p>
            </div>
            <div style={{ color: '#aabbdd', fontSize: 14, textAlign: 'center', lineHeight: 2 }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: 'rgba(102, 204, 255, 0.15)',
                    border: '1px solid rgba(102, 204, 255, 0.4)',
                    borderRadius: 6,
                    marginRight: 8,
                    color: '#66ccff',
                    fontWeight: 600,
                  }}
                >
                  SPACE
                </span>
                跳跃越过低栏
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: 'rgba(170, 136, 255, 0.15)',
                    border: '1px solid rgba(170, 136, 255, 0.4)',
                    borderRadius: 6,
                    marginRight: 8,
                    color: '#aa88ff',
                    fontWeight: 600,
                  }}
                >
                  S
                </span>
                滑铲穿越横梁
              </div>
            </div>
            {bestScore > 0 && (
              <div style={{ color: '#ffcc66', fontSize: 16 }}>
                最高分数: <span style={{ fontWeight: 700 }}>{bestScore}</span>
              </div>
            )}
          </div>
        )}
        {gameState === 'ended' && engineState?.result && (
          <div
            style={{
              position: 'absolute',
              bottom: isMobile ? 260 : 40,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <button
              onClick={handleRestart}
              style={{
                padding: '14px 40px',
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #4488ff, #8855ff)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                letterSpacing: 2,
                boxShadow: '0 8px 32px rgba(68, 136, 255, 0.4)',
              }}
            >
              再来一局
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          width: isMobile ? '100%' : 250,
          height: isMobile ? 'auto' : '100%',
          background: 'rgba(20, 30, 60, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: isMobile ? 'none' : '1px solid rgba(100, 140, 220, 0.2)',
          borderTop: isMobile ? '1px solid rgba(100, 140, 220, 0.2)' : 'none',
          padding: isMobile ? 16 : 24,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: isMobile ? 20 : 24,
          alignItems: isMobile ? 'center' : 'stretch',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
          flexShrink: 0,
          overflow: isMobile ? 'visible' : 'auto',
        }}
      >
        {(gameState === 'idle' || gameState === 'ended') && (
          <button
            onClick={handleStart}
            style={{
              padding: isMobile ? '12px 28px' : '16px 32px',
              fontSize: isMobile ? 15 : 18,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #ff8844, #ff5577)',
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              letterSpacing: 3,
              boxShadow: '0 0 30px rgba(255, 136, 68, 0.3)',
              animation: 'breathing 2s ease-in-out infinite',
              transition: 'box-shadow 0.2s, transform 0.1s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 50px rgba(255, 136, 68, 0.6), inset 0 0 20px rgba(255, 200, 150, 0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 30px rgba(255, 136, 68, 0.3)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {gameState === 'ended' ? '重新开始' : '开始游戏'}
          </button>
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <button
            onClick={handlePause}
            style={{
              padding: isMobile ? '8px 20px' : '10px 20px',
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              color: '#aaccff',
              background: 'rgba(100, 150, 220, 0.15)',
              border: '1px solid rgba(100, 150, 220, 0.4)',
              borderRadius: 10,
              cursor: 'pointer',
              letterSpacing: 2,
              flexShrink: 0,
            }}
          >
            {gameState === 'paused' ? '继续' : '暂停'}
          </button>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 0 : 4,
            alignItems: isMobile ? 'center' : 'flex-start',
          }}
        >
          <span style={{ color: '#667799', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            分数
          </span>
          <span
            style={{
              color: '#ffffff',
              fontSize: isMobile ? 28 : 42,
              fontWeight: 900,
              fontFamily: 'monospace',
              textShadow: '0 0 20px rgba(102, 204, 255, 0.4)',
              letterSpacing: 2,
              lineHeight: 1,
              marginTop: isMobile ? 2 : 4,
            }}
          >
            {Math.round(displayScore).toLocaleString()}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 0 : 4,
            alignItems: isMobile ? 'center' : 'flex-start',
          }}
        >
          <span style={{ color: '#667799', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            连击
          </span>
          <span
            style={{
              fontSize: isMobile ? 24 : 36,
              fontWeight: 900,
              background: `linear-gradient(180deg, #ffee66 0%, #ff8844 ${Math.min(
                (engineState?.score.combo ?? 0) / 30,
                1
              ) * 100}%, #ff3355 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 1,
              lineHeight: 1,
              marginTop: isMobile ? 2 : 4,
              transform: `scale(${1 + (engineState?.comboPulse ?? 0) * 0.3})`,
              transition: 'transform 0.1s',
            }}
          >
            {engineState?.score.combo ?? 0}
          </span>
        </div>

        {!isMobile && (
          <div
            style={{
              marginTop: 'auto',
              padding: 16,
              background: 'rgba(40, 60, 100, 0.3)',
              borderRadius: 12,
              border: '1px solid rgba(100, 150, 220, 0.15)',
            }}
          >
            <div
              style={{
                color: '#667799',
                fontSize: 11,
                letterSpacing: 2,
                marginBottom: 10,
                textTransform: 'uppercase',
              }}
            >
              操作说明
            </div>
            <div style={{ color: '#99aabb', fontSize: 13, lineHeight: 1.8 }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 50,
                    padding: '2px 8px',
                    background: 'rgba(102, 204, 255, 0.15)',
                    border: '1px solid rgba(102, 204, 255, 0.3)',
                    borderRadius: 4,
                    color: '#66ccff',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'center',
                    marginRight: 8,
                  }}
                >
                  SPACE
                </span>
                跳跃
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 50,
                    padding: '2px 8px',
                    background: 'rgba(170, 136, 255, 0.15)',
                    border: '1px solid rgba(170, 136, 255, 0.3)',
                    borderRadius: 4,
                    color: '#aa88ff',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'center',
                    marginRight: 8,
                  }}
                >
                  S
                </span>
                滑铲
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes breathing {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 136, 68, 0.3);
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 136, 68, 0.6), 0 0 80px rgba(255, 80, 100, 0.3);
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
};

export default GameUI;
