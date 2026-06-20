import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MazeEngine, type MazeData } from './MazeEngine';
import { ObstacleManager, type Obstacle } from './ObstacleManager';
import { audioEngine } from './AudioEngine';

export interface GameStats {
  totalScore: number;
  levelsCleared: number;
  totalTime: number;
  bestCombo: number;
  avgTime: number;
}

interface GameBoardProps {
  onGameOver: (stats: GameStats) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}

type MoveState = 'idle' | 'moving';

const INITIAL_LIVES = 3;
const TOTAL_LEVELS = 5;
const MOVE_DURATION = 200;

export default function GameBoard({ onGameOver }: GameBoardProps) {
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [mazeData, setMazeData] = useState<MazeData | null>(null);
  const [obstacleManager, setObstacleManager] = useState<ObstacleManager | null>(null);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [targetPos, setTargetPos] = useState({ x: 1, y: 1 });
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [moving, setMoving] = useState<MoveState>('idle');
  const [hitFlash, setHitFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [obstaclePositions, setObstaclePositions] = useState<{ id: number; x: number; y: number; trail: { x: number; y: number; opacity: number }[] }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [victoryParticles, setVictoryParticles] = useState(false);
  const [deathAnim, setDeathAnim] = useState(false);
  const [levelStartTime, setLevelStartTime] = useState(Date.now());
  const [levelTimes, setLevelTimes] = useState<number[]>([]);
  const [cellSize, setCellSize] = useState(36);
  const [showLevelBanner, setShowLevelBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [playerShatter, setPlayerShatter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const moveTimeoutRef = useRef<number | null>(null);

  const shuffleArray = useCallback(function <T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    computeCellSize();
    window.addEventListener('resize', computeCellSize);
    return () => window.removeEventListener('resize', computeCellSize);

    function computeCellSize() {
      if (!mazeData) {
        const size = Math.min(window.innerWidth, window.innerHeight) * 0.7;
        const base = Math.floor(size / 17);
        setCellSize(Math.max(20, Math.min(base, 44)));
        return;
      }
      const maxW = Math.min(window.innerWidth * 0.7, 700);
      const maxH = Math.min(window.innerHeight * 0.72, 700);
      const byW = Math.floor(maxW / mazeData.cols);
      const byH = Math.floor(maxH / mazeData.rows);
      setCellSize(Math.max(16, Math.min(byW, byH, 44)));
    }
  }, [mazeData]);

  const initLevel = useCallback((lv: number) => {
    const gridSize = 8 + Math.min(lv - 1, 4);
    const seed = Date.now() + lv * 1337;
    const engine = new MazeEngine(seed, gridSize, gridSize);
    const data = engine.generate();
    const om = new ObstacleManager(data, lv, seed + 777);
    const frags: Fragment[] = data.fragments.map((f) => ({ ...f, collected: false }));

    setMazeData(data);
    setObstacleManager(om);
    setFragments(frags);
    setPlayer({ ...data.start });
    setTargetPos({ ...data.start });
    setMoving('idle');
    setCombo(0);
    setLevelStartTime(Date.now());
    setBannerText(`第 ${lv} 关`);
    setShowLevelBanner(true);
    setTimeout(() => setShowLevelBanner(false), 1200);
  }, []);

  useEffect(() => {
    audioEngine.init();
    initLevel(1);
  }, [initLevel]);

  const spawnParticles = useCallback((cx: number, cy: number, count: number, color: string) => {
    const newParts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      newParts.push({
        id: particleIdRef.current++,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
    setParticles((p) => [...p, ...newParts]);
  }, []);

  useEffect(() => {
    if (!obstacleManager || !mazeData) return;

    const loop = (t: number) => {
      const dt = Math.min(50, t - (lastTimeRef.current || t));
      lastTimeRef.current = t;

      obstacleManager.update(dt, cellSize);
      const pos = obstacleManager.obstacles.map((o: Obstacle) => ({
        id: o.id,
        ...obstacleManager.getSmoothPosition(o),
        trail: o.trail,
      }));
      setObstaclePositions(pos);

      const collided = obstacleManager.checkCollision(player.x, player.y);
      if (collided && moving === 'idle' && !deathAnim && !playerShatter) {
        handlePlayerDeath();
      }

      setParticles((prev) => {
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * 0.92,
            y: p.y + p.vy * 0.92,
            vy: p.vy + 0.05,
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0);
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [obstacleManager, mazeData, player, moving, cellSize, deathAnim, playerShatter]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (deathAnim || playerShatter || showLevelBanner) return;
      const key = e.key.toLowerCase();
      let dx = 0, dy = 0;
      if (key === 'w' || key === 'arrowup') dy = -1;
      else if (key === 's' || key === 'arrowdown') dy = 1;
      else if (key === 'a' || key === 'arrowleft') dx = -1;
      else if (key === 'd' || key === 'arrowright') dx = 1;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        tryMove(dx, dy);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mazeData, moving, targetPos, deathAnim, playerShatter, showLevelBanner]);

  const tryMove = useCallback(
    (dx: number, dy: number) => {
      if (!mazeData || moving !== 'idle') return;

      const nx = targetPos.x + dx;
      const ny = targetPos.y + dy;

      if (
        ny < 0 || ny >= mazeData.rows || nx < 0 || nx >= mazeData.cols || mazeData.grid[ny][nx] !== 'path'
      ) {
        audioEngine.wallHit();
        setHitFlash(true);
        setShake(true);
        setCombo(0);
        setTimeout(() => {
          setHitFlash(false);
          setShake(false);
        }, 300);
        return;
      }

      setMoving('moving');
      setTargetPos({ x: nx, y: ny });
      audioEngine.move();

      if (moveTimeoutRef.current !== null) {
        window.clearTimeout(moveTimeoutRef.current);
      }
      moveTimeoutRef.current = window.setTimeout(() => {
        setPlayer({ x: nx, y: ny });
        setMoving('idle');

        const fragIdx = fragments.findIndex((f) => !f.collected && f.x === nx && f.y === ny);
        if (fragIdx >= 0) {
          audioEngine.collect();
          setFragments((prev) =>
            prev.map((f, i) => (i === fragIdx ? { ...f, collected: true } : f))
          );
          setScore((s) => s + 5);
          setCombo((c) => {
            const nc = c + 1;
            setBestCombo((b) => Math.max(b, nc));
            return nc;
          });
          setTimeout(() => {
            spawnParticles(
              nx * cellSize + cellSize / 2,
              ny * cellSize + cellSize / 2,
              10,
              '#ffd700'
            );
          }, 60);
        }

        if (nx === mazeData.exit.x && ny === mazeData.exit.y) {
          handleLevelComplete();
        }
        moveTimeoutRef.current = null;
      }, MOVE_DURATION);
    },
    [mazeData, moving, targetPos, fragments, cellSize, spawnParticles]
  );

  const handlePlayerDeath = useCallback(() => {
    audioEngine.crash();
    setCombo(0);
    setPlayerShatter(true);
    spawnParticles(
      player.x * cellSize + cellSize / 2,
      player.y * cellSize + cellSize / 2,
      14,
      '#ff4444'
    );

    setTimeout(() => {
      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          const totalTime =
            levelTimes.reduce((a, b) => a + b, 0) + (Date.now() - levelStartTime) / 1000;
          audioEngine.gameOver();
          setDeathAnim(true);
          setTimeout(() => {
            onGameOver({
              totalScore: score,
              levelsCleared: level - 1,
              totalTime,
              bestCombo,
              avgTime: levelTimes.length > 0 ? totalTime / (levelTimes.length || 1) : 0,
            });
          }, 1800);
        }
        return newLives;
      });

      setTimeout(() => {
        if (mazeData && lives - 1 > 0) {
          const frags: Fragment[] = mazeData.fragments.map((f) => ({ ...f, collected: false }));
          setFragments(frags);
          setPlayer({ ...mazeData.start });
          setTargetPos({ ...mazeData.start });
          obstacleManager?.reset();
          setLevelStartTime(Date.now());
        }
        setPlayerShatter(false);
      }, 600);
    }, 500);
  }, [player, cellSize, mazeData, obstacleManager, lives, levelTimes, levelStartTime, score, level, bestCombo, spawnParticles, onGameOver]);

  const handleLevelComplete = useCallback(() => {
    if (!mazeData) return;
    audioEngine.victory();
    setVictoryParticles(true);

    const lvlTime = (Date.now() - levelStartTime) / 1000;
    setLevelTimes((prev) => [...prev, lvlTime]);

    const collectedCount = fragments.filter((f) => f.collected).length;
    const levelBonus = 100 + collectedCount * 5;
    setScore((s) => s + levelBonus);

    setTimeout(() => {
      setVictoryParticles(false);
      if (level >= TOTAL_LEVELS) {
        const totalTime = [...levelTimes, lvlTime].reduce((a, b) => a + b, 0);
        audioEngine.gameOver();
        setDeathAnim(true);
        setTimeout(() => {
          onGameOver({
            totalScore: score + levelBonus,
            levelsCleared: level,
            totalTime,
            bestCombo: Math.max(bestCombo, combo),
            avgTime: totalTime / (levelTimes.length + 1),
          });
        }, 1800);
      } else {
        const nextLv = level + 1;
        setLevel(nextLv);
        initLevel(nextLv);
      }
    }, 2000);
  }, [mazeData, fragments, level, levelStartTime, levelTimes, score, bestCombo, combo, initLevel, onGameOver]);

  const touchBtn = (dx: number, dy: number) => () => {
    if (deathAnim || playerShatter || showLevelBanner) return;
    tryMove(dx, dy);
  };

  const boardStyle = useMemo(() => {
    if (!mazeData) return {};
    return {
      width: mazeData.cols * cellSize,
      height: mazeData.rows * cellSize,
    };
  }, [mazeData, cellSize]);

  const renderCells = useMemo(() => {
    if (!mazeData) return null;
    const cells: JSX.Element[] = [];
    for (let y = 0; y < mazeData.rows; y++) {
      for (let x = 0; x < mazeData.cols; x++) {
        const isExit = x === mazeData.exit.x && y === mazeData.exit.y;
        const type = mazeData.grid[y][x];
        cells.push(
          <div
            key={`c-${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * cellSize,
              top: y * cellSize,
              width: cellSize,
              height: cellSize,
              backgroundColor: type === 'wall' ? '#444444' : '#e0e0e0',
              boxShadow:
                type === 'wall'
                  ? 'inset 0 0 6px rgba(0,0,0,0.5)'
                  : 'inset 0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {isExit && (
              <motion.div
                initial={{ opacity: 0.6, scale: 0.8 }}
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.1, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: 2,
                  borderRadius: 6,
                  background:
                    'radial-gradient(circle, rgba(0,255,120,0.95) 0%, rgba(0,200,80,0.7) 45%, rgba(0,160,60,0) 100%)',
                }}
              />
            )}
          </div>
        );
      }
    }
    return cells;
  }, [mazeData, cellSize]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #0a0a2e 0%, #1a1a3e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: isMobile ? 8 : 16,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: isMobile ? 12 : 24,
          top: isMobile ? 12 : 24,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 6 : 10,
          zIndex: 10,
          fontSize: isMobile ? 12 : 14,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
          padding: isMobile ? 10 : 16,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ fontWeight: 600 }}>
          第 <span style={{ color: '#ffd700' }}>{level}</span> / {TOTAL_LEVELS} 关
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
            <span key={i} style={{ fontSize: isMobile ? 14 : 18 }}>
              {i < lives ? (
                <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}>
                  <svg viewBox="0 0 24 24" width={isMobile ? 16 : 22} fill="#ff4444">
                    <path d="M12 21s-7-4.35-9.5-8.5C.5 9 3 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 7.5C19 16.65 12 21 12 21z" />
                  </svg>
                </motion.span>
              ) : (
                <svg viewBox="0 0 24 24" width={isMobile ? 16 : 22} fill="#555555">
                  <path d="M12 21s-7-4.35-9.5-8.5C.5 9 3 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 7.5C19 16.65 12 21 12 21z" />
                </svg>
              )}
            </span>
          ))}
        </div>
        <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700 }}>
          {score}
        </div>
        {combo > 1 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: '#ffd700', fontWeight: 700, fontSize: isMobile ? 14 : 18 }}
          >
            连击 x{combo}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showLevelBanner && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              top: '40%',
              zIndex: 30,
              fontSize: isMobile ? 32 : 56,
              fontWeight: 800,
              color: '#fff',
              textShadow: '0 0 20px rgba(106,17,203,0.9), 0 0 40px rgba(37,117,252,0.6)',
              pointerEvents: 'none',
            }}
          >
            {bannerText}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.3 }}
        style={{
          position: 'relative',
          ...boardStyle,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.05)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {renderCells}

        {fragments.map((f, i) => (
          <AnimatePresence key={`frag-${i}`}>
            {!f.collected ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'absolute',
                  left: f.x * cellSize + cellSize / 2 - (isMobile ? 7 : 10),
                  top: f.y * cellSize + cellSize / 2 - (isMobile ? 7 : 10),
                  width: isMobile ? 14 : 20,
                  height: isMobile ? 14 : 20,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #fff8a0 0%, #ffd700 50%, #d49c00 100%)',
                  boxShadow: '0 0 12px rgba(255,215,0,0.9)',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    boxShadow: '0 0 16px rgba(255,235,80,0.9)',
                  }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        ))}

        {obstaclePositions.map((obs) => (
          <div key={`otrail-${obs.id}`}>
            {obs.trail.map((t, idx) => (
              <div
                key={`tr-${obs.id}-${idx}`}
                style={{
                  position: 'absolute',
                  left: t.x * cellSize + cellSize * 0.1,
                  top: t.y * cellSize + cellSize * 0.1,
                  width: cellSize * 0.8,
                  height: cellSize * 0.8,
                  background: '#ff4444',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  opacity: t.opacity * 0.45,
                  filter: `blur(${1 + idx}px)`,
                  pointerEvents: 'none',
                  transition: 'left 0.08s linear',
                }}
              />
            ))}
          </div>
        ))}

        {obstaclePositions.map((obs) => (
          <motion.div
            key={`obs-${obs.id}`}
            animate={{
              left: obs.x * cellSize + cellSize * 0.1,
              top: obs.y * cellSize + cellSize * 0.1,
            }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.08 }}
            style={{
              position: 'absolute',
              width: cellSize * 0.8,
              height: cellSize * 0.8,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #ff6666 0%, #ff4444 50%, #cc1111 100%)',
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                boxShadow: '0 0 12px rgba(255,68,68,0.7)',
              }}
            />
          </motion.div>
        ))}

        <AnimatePresence>
          {!playerShatter && (
            <motion.div
              animate={{
                left: targetPos.x * cellSize + cellSize * 0.15,
                top: targetPos.y * cellSize + cellSize * 0.15,
              }}
              transition={{ type: 'tween', duration: MOVE_DURATION / 1000, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: cellSize * 0.7,
                height: cellSize * 0.7,
                zIndex: 5,
              }}
            >
              <motion.div
                animate={
                  hitFlash
                    ? { backgroundColor: ['#4fc3f7', '#ff0000', '#4fc3f7', '#ff0000', '#4fc3f7'] }
                    : { backgroundColor: '#4fc3f7' }
                }
                transition={{ duration: 0.3 }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  boxShadow: '0 0 16px rgba(79,195,247,0.9), inset -3px -3px 6px rgba(0,0,0,0.2), inset 3px 3px 6px rgba(255,255,255,0.3)',
                  border: '2px solid rgba(255,255,255,0.5)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '20%',
                    left: '22%',
                    width: '18%',
                    height: '18%',
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '20%',
                    right: '22%',
                    width: '18%',
                    height: '18%',
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {particles.map((p) => (
          <div
            key={`p-${p.id}`}
            style={{
              position: 'absolute',
              left: p.x - 3,
              top: p.y - 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: p.color,
              opacity: p.life,
              boxShadow: `0 0 8px ${p.color}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {victoryParticles && <VictoryFountain cellSize={cellSize} mazeData={mazeData} />}
      </motion.div>

      {isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 60px)',
            gridTemplateRows: 'repeat(3, 60px)',
            gap: 6,
            zIndex: 20,
          }}
        >
          <div />
          <TouchBtn onClick={touchBtn(0, -1)}>▲</TouchBtn>
          <div />
          <TouchBtn onClick={touchBtn(-1, 0)}>◀</TouchBtn>
          <div />
          <TouchBtn onClick={touchBtn(1, 0)}>▶</TouchBtn>
          <div />
          <TouchBtn onClick={touchBtn(0, 1)}>▼</TouchBtn>
          <div />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: isMobile ? 12 : 24,
          top: isMobile ? 12 : 24,
          zIndex: 10,
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => audioEngine.setEnabled(!audioEngine.isEnabled())}
          style={{
            background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
            color: '#fff',
            border: 'none',
            padding: isMobile ? '8px 14px' : '10px 20px',
            borderRadius: 8,
            fontSize: isMobile ? 12 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(106,17,203,0.4)',
          }}
        >
          {audioEngine.isEnabled() ? '🔊 音效' : '🔇 静音'}
        </motion.button>
      </div>

      <AnimatePresence>
        {deathAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              style={{
                color: lives <= 0 ? '#ff4444' : '#ffd700',
                fontSize: isMobile ? 28 : 48,
                fontWeight: 800,
                textShadow: '0 0 30px currentColor',
              }}
            >
              {lives <= 0 ? '游戏结束' : '恭喜通关！'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TouchBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onTouchStart={(e) => {
        e.preventDefault();
        onClick();
      }}
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(106,17,203,0.8) 0%, rgba(37,117,252,0.8) 100%)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        fontSize: 22,
        fontWeight: 700,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {children}
    </motion.button>
  );
}

function VictoryFountain({ cellSize, mazeData }: { cellSize: number; mazeData: MazeData | null }) {
  const [parts, setParts] = useState<Particle[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!mazeData) return;
      const cx = mazeData.exit.x * cellSize + cellSize / 2;
      const cy = mazeData.exit.y * cellSize + cellSize / 2;
      const newOnes: Particle[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7;
        const speed = 3 + Math.random() * 5;
        newOnes.push({
          id: idRef.current++,
          x: cx + (Math.random() - 0.5) * 10,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffffff', '#ff9ff3'][Math.floor(Math.random() * 5)],
        });
      }
      setParts((p) => [...p.slice(-200), ...newOnes]);
    }, 60);
    return () => window.clearInterval(interval);
  }, [mazeData, cellSize]);

  useEffect(() => {
    const raf = requestAnimationFrame(function tick() {
      setParts((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2,
            life: p.life - 0.015,
          }))
          .filter((p) => p.life > 0)
      );
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {parts.map((p) => (
        <div
          key={`vp-${p.id}`}
          style={{
            position: 'absolute',
            left: p.x - 4,
            top: p.y - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: p.color,
            opacity: p.life,
            boxShadow: `0 0 10px ${p.color}`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
