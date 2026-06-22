import React, { useEffect, useRef, useState, useCallback } from 'react';
import CharacterCustomizer, { CharacterAppearance } from './components/CharacterCustomizer';
import { GameEngine, CharacterAttributes, GameState } from './game/GameEngine';

interface SaveData {
  appearance: CharacterAppearance;
  highScore: number;
}

const SAVE_KEY = 'parkour_simulator_save';

const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  speed: 40,
  jump: 30,
  stamina: 30,
};

const DEFAULT_APPEARANCE: CharacterAppearance = {
  body: 0,
  hair: 0,
  top: 0,
  bottom: 0,
  shoes: 0,
};

const BODY_COLORS: string[] = ['#ffcc99', '#d4a373', '#8d5524', '#6f4e37'];
const HAIR_COLORS: string[] = ['#000000', '#8b4513', '#ffd700', '#ff0000', '#00ffff'];
const TOP_COLORS: string[] = ['#0066cc', '#ff3366', '#33cc33', '#ff9900', '#9900ff'];
const BOTTOM_COLORS: string[] = ['#333366', '#006666', '#660033', '#336600'];
const SHOE_COLORS: string[] = ['#ffffff', '#000000', '#ff0000', '#00ffff'];

type GameScreen = 'customize' | 'playing' | 'gameover';

const App: React.FC = () => {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const smallPreviewRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [appearance, setAppearance] = useState<CharacterAppearance>(DEFAULT_APPEARANCE);
  const [attributes, setAttributes] = useState<CharacterAttributes>(DEFAULT_ATTRIBUTES);
  const [highlightedPart, setHighlightedPart] = useState<keyof CharacterAppearance | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isGameOver: false,
    scrollSpeed: 2,
    isRunning: false,
  });

  const [screen, setScreen] = useState<GameScreen>('customize');
  const [highScore, setHighScore] = useState<number>(0);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data: SaveData = JSON.parse(saved);
        setAppearance(data.appearance);
        setHighScore(data.highScore);
      } catch {
        console.error('Failed to load save data');
      }
    }
  }, []);

  useEffect(() => {
    if (screen !== 'playing') return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, attributes);
    engine.setAppearance(appearance);
    engine.setAttributes(attributes);
    engine.setCallbacks(
      (state) => setGameState(state),
      (score) => {
        setFinalScore(score);
        if (score > highScore) {
          setHighScore(score);
        }
        setScreen('gameover');
      }
    );
    engineRef.current = engine;

    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [screen, appearance, attributes, highScore]);

  useEffect(() => {
    if (screen === 'playing') return;
    const canvas = smallPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animating = true;
    const animate = () => {
      if (!animating) return;
      drawSmallPreview(ctx, appearance);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      animating = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [screen, appearance]);

  const handleStartGame = useCallback(() => {
    setScreen('playing');
    setGameState({ score: 0, isGameOver: false, scrollSpeed: 2, isRunning: true });
  }, []);

  const handleBackToCustomize = useCallback(() => {
    setScreen('customize');
    setGameState({ score: 0, isGameOver: false, scrollSpeed: 2, isRunning: false });
  }, []);

  const handleSave = useCallback(() => {
    const data: SaveData = { appearance, highScore };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 2000);
  }, [appearance, highScore]);

  const handleAttributesChange = useCallback((newAttrs: CharacterAttributes) => {
    const total = newAttrs.speed + newAttrs.jump + newAttrs.stamina;
    if (total === 100) {
      setAttributes(newAttrs);
    } else {
      const scale = 100 / total;
      setAttributes({
        speed: Math.round(newAttrs.speed * scale),
        jump: Math.round(newAttrs.jump * scale),
        stamina: Math.round(100 - Math.round(newAttrs.speed * scale) - Math.round(newAttrs.jump * scale)),
      });
    }
  }, []);

  return (
    <>
      <div className="particles-bg">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${100 + Math.random() * 20}%`,
              animationDuration: `${15 + Math.random() * 10}s`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {showSaveIndicator && <div className="save-indicator">✓ 存档已保存</div>}

      <div className="app-container">
        <CharacterCustomizer
          appearance={appearance}
          attributes={attributes}
          onAppearanceChange={setAppearance}
          onAttributesChange={handleAttributesChange}
          highlightedPart={highlightedPart}
          onHighlightPart={setHighlightedPart}
        />

        <div className="game-wrapper">
          <canvas
            ref={gameCanvasRef}
            className="game-canvas"
            width={320}
            height={480}
          />

          {screen === 'playing' && (
            <div className="hud-top">
              <div className="hud-item">
                <span className="hud-label">得分</span>
                <span className="hud-value">{gameState.score}</span>
              </div>
              <div className="hud-item">
                <span className="hud-label">速度</span>
                <span className="hud-value">{gameState.scrollSpeed.toFixed(1)}</span>
              </div>
            </div>
          )}

          {screen === 'customize' && (
            <div className="start-screen">
              <div className="start-title">赛博跑酷</div>
              <div className="start-subtitle">
                按 空格键 / ↑ 跳跃
                <br />
                躲避障碍物，冲刺高分！
              </div>
              <button className="btn" onClick={handleStartGame}>
                开始游戏
              </button>
              <button className="btn accent small" onClick={handleSave} style={{ marginTop: 12 }}>
                保存装扮
              </button>
            </div>
          )}

          {screen === 'gameover' && (
            <div className="gameover-overlay">
              <div className="gameover-panel">
                <div className="gameover-title">游戏结束</div>
                <div className="gameover-score">本局得分: {finalScore}</div>
                <div className="gameover-highscore">{highScore}</div>
                <div className="gameover-score" style={{ color: '#88ccff', marginBottom: 16 }}>
                  最高分
                </div>
                <button className="btn" onClick={handleStartGame}>
                  再来一局
                </button>
                <button className="btn accent" onClick={handleBackToCustomize}>
                  返回自定义
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="side-panel score-panel">
          <div className="panel-title">当前角色</div>
          <canvas ref={smallPreviewRef} className="character-preview-small" width={64} height={96} />
          <div className="score-label">最高分</div>
          <div className="score-value">{highScore}</div>
          {screen === 'playing' && (
            <>
              <div className="score-label" style={{ marginTop: 16 }}>当前得分</div>
              <div className="score-value" style={{ fontSize: 24, color: '#00f0ff', textShadow: '0 0 10px #00f0ff' }}>
                {gameState.score}
              </div>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="btn small" onClick={handleSave} style={{ width: '100%' }}>
              保存存档
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

function drawSmallPreview(ctx: CanvasRenderingContext2D, appearance: CharacterAppearance) {
  const w = 64;
  const h = 96;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, w, h);

  const bodyColor = BODY_COLORS[appearance.body % BODY_COLORS.length];
  const hairColor = HAIR_COLORS[appearance.hair % HAIR_COLORS.length];
  const topColor = TOP_COLORS[appearance.top % TOP_COLORS.length];
  const bottomColor = BOTTOM_COLORS[appearance.bottom % BOTTOM_COLORS.length];
  const shoeColor = SHOE_COLORS[appearance.shoes % SHOE_COLORS.length];

  const scale = w / 24;
  const px = (val: number) => Math.floor(val * scale);
  const pxs = (val: number) => Math.max(1, Math.floor(val * scale));

  const bounce = Math.sin(Date.now() / 200) * 2;
  const offsetY = Math.floor(bounce);

  ctx.fillStyle = hairColor;
  ctx.fillRect(px(7), offsetY + px(0), pxs(10), pxs(3));
  ctx.fillRect(px(6), offsetY + px(1), pxs(1), pxs(3));
  ctx.fillRect(px(17), offsetY + px(1), pxs(1), pxs(3));

  ctx.fillStyle = bodyColor;
  ctx.fillRect(px(8), offsetY + px(3), pxs(8), pxs(5));

  ctx.fillStyle = '#000000';
  ctx.fillRect(px(10), offsetY + px(5), pxs(1), pxs(1));
  ctx.fillRect(px(13), offsetY + px(5), pxs(1), pxs(1));

  ctx.fillStyle = topColor;
  ctx.fillRect(px(3), offsetY + px(8), pxs(18), pxs(8));
  ctx.fillRect(px(0), offsetY + px(10), pxs(3), pxs(6));
  ctx.fillRect(px(21), offsetY + px(10), pxs(3), pxs(6));

  ctx.fillStyle = bottomColor;
  ctx.fillRect(px(5), offsetY + px(16), pxs(6), pxs(8));
  ctx.fillRect(px(13), offsetY + px(16), pxs(6), pxs(8));

  ctx.fillStyle = shoeColor;
  ctx.fillRect(px(3), offsetY + px(22), pxs(8), pxs(3));
  ctx.fillRect(px(13), offsetY + px(22), pxs(8), pxs(3));
}

export default App;
