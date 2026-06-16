import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { MapRenderer } from './renderer/MapRenderer';
import { UIRenderer } from './renderer/UIRenderer';
import { SpatialAudioEngine } from './audio/SpatialAudioEngine';
import type { InputState } from './types';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

export default function App() {
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const uiRendererRef = useRef<UIRenderer | null>(null);
  const audioEngineRef = useRef<SpatialAudioEngine | null>(null);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    interact: false,
  });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const ventInitRef = useRef<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!mapCanvasRef.current || !uiCanvasRef.current) return;

    engineRef.current = new GameEngine();
    mapRendererRef.current = new MapRenderer(mapCanvasRef.current, GAME_WIDTH, GAME_HEIGHT);
    uiRendererRef.current = new UIRenderer(uiCanvasRef.current, GAME_WIDTH, GAME_HEIGHT);
    audioEngineRef.current = new SpatialAudioEngine();

    const audio = audioEngineRef.current;
    engineRef.current.setAudioCallback(src => audio.handleAudioSource(src));
    engineRef.current.setAlertCallback(active => {
      if (active) audio.playUISound('alert');
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const sx = w / GAME_WIDTH;
      const sy = h / GAME_HEIGHT;
      setScale(Math.min(sx, sy) * 0.95);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.up = true;
      if (k === 's' || k === 'arrowdown') inputRef.current.down = true;
      if (k === 'a' || k === 'arrowleft') inputRef.current.left = true;
      if (k === 'd' || k === 'arrowright') inputRef.current.right = true;
      if (k === 'e') inputRef.current.interact = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.up = false;
      if (k === 's' || k === 'arrowdown') inputRef.current.down = false;
      if (k === 'a' || k === 'arrowleft') inputRef.current.left = false;
      if (k === 'd' || k === 'arrowright') inputRef.current.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    (async () => {
      await engineRef.current!.init();
      setLoading(false);
    })();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000 || 0.016);
      lastTimeRef.current = time;

      const engine = engineRef.current!;
      const mapRenderer = mapRendererRef.current!;
      const uiRenderer = uiRendererRef.current!;
      const audio = audioEngineRef.current!;

      if (engine.state.running) {
        engine.update(dt, inputRef.current);

        audio.setPlayerPosition(
          { x: engine.state.player.x, y: engine.state.player.y },
          engine.state.player.facing
        );

        if (!ventInitRef.current && engine.state.map) {
          for (const v of engine.state.map.vents) {
            audio.playVentSound(v.x, v.y);
          }
          ventInitRef.current = true;
        }
        if (engine.state.map) {
          audio.updateVentVolumes(engine.state.map.vents);
        }

        mapRenderer.render(engine.state);
        uiRenderer.render(engine.state, audio.getLoudestSource(), time);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      audioEngineRef.current?.dispose();
    };
  }, []);

  const handleStartAudio = async () => {
    await audioEngineRef.current?.init();
    setAudioReady(true);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: GAME_WIDTH * scale,
        height: GAME_HEIGHT * scale,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <canvas
          ref={mapCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            imageRendering: 'pixelated',
          }}
        />
        <canvas
          ref={uiCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#0a0a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#00ffff',
            fontFamily: 'Courier New, monospace',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 16 }}>正在生成迷宫...</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            连接后端服务器 localhost:5000
          </div>
        </div>
      )}

      {!loading && !audioReady && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(10, 10, 26, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#00ffff',
            fontFamily: 'Courier New, monospace',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 24 }}>空间音效潜行游戏</div>
          <div style={{ fontSize: 12, marginBottom: 24, opacity: 0.8, textAlign: 'center', lineHeight: 1.6 }}>
            WASD 移动 · E 开关门<br />
            聆听环境音效判断AI位置<br />
            躲避AI到达目标点
          </div>
          <button
            onClick={handleStartAudio}
            style={{
              background: 'transparent',
              border: '2px solid #00ffff',
              color: '#00ffff',
              padding: '12px 32px',
              fontFamily: 'Courier New, monospace',
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(0,255,255,0.3)',
            }}
          >
            点击开始游戏
          </button>
        </div>
      )}
    </div>
  );
}
