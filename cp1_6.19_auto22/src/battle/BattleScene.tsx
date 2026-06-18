import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import CanvasRenderer from './CanvasRenderer';
import type { ShipRenderData, ProjectileRenderData, ParticleRenderData, WaveData } from './CanvasRenderer';

interface ShipEntity extends ShipRenderData {
  id: string;
  velocityX: number;
  velocityY: number;
  hitsTaken: number;
  lastFireTime: number;
}

interface ProjectileEntity extends ProjectileRenderData {
  id: string;
  vx: number;
  vy: number;
  isPlayer: boolean;
}

interface ParticleEntity extends ParticleRenderData {
  id: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 3;
const ENEMY_SPEED = 1.5;
const PROJECTILE_SPEED = 8;
const ENEMY_PROJECTILE_SPEED = 5;
const PROJECTILE_RADIUS = 8;
const ENEMY_FIRE_RANGE = 150;
const ENEMY_FIRE_COOLDOWN = 1500;
const SHIP_SIZE = 40;
const ENEMY_HITS_TO_SINK = 3;
const ENEMY_COUNT = 3;
const PARTICLE_COUNT = 20;

const BattleScene: React.FC = () => {
  const { activeShipId, endBattle } = useGameStore();
  const activeShip = useGameStore(state =>
    state.ships.find(s => s.id === state.activeShipId)
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const playerShipRef = useRef<ShipEntity | null>(null);
  const enemyShipsRef = useRef<ShipEntity[]>([]);
  const projectilesRef = useRef<ProjectileEntity[]>([]);
  const particlesRef = useRef<ParticleEntity[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<{ x: number; y: number; isDown: boolean }>({ x: 0, y: 0, isDown: false });
  const lastFireRef = useRef<number>(0);
  const playerHitsRef = useRef<number>(0);
  const goldEarnedRef = useRef<number>(0);
  const enemiesDestroyedRef = useRef<number>(0);
  const battleEndedRef = useRef<boolean>(false);
  const battleTimeRef = useRef<number>(0);

  const wavesRef = useRef<WaveData[]>([
    { amplitude: 5, frequency: 1, phase: 0, speed: 1 },
    { amplitude: 3, frequency: 2.5, phase: 1, speed: 1.5 },
    { amplitude: 2, frequency: 4, phase: 2, speed: 0.8 },
    { amplitude: 1.5, frequency: 6, phase: 0.5, speed: 2 },
    { amplitude: 1, frequency: 8, phase: 1.5, speed: 1.2 },
  ]);

  const [, setRenderTick] = useState(0);

  const initGame = useCallback(() => {
    if (!activeShip) return;

    playerShipRef.current = {
      id: 'player',
      x: 100,
      y: CANVAS_HEIGHT / 2,
      angle: 0,
      health: activeShip.currentDurability,
      maxHealth: activeShip.maxDurability,
      isPlayer: true,
      size: SHIP_SIZE,
      velocityX: 0,
      velocityY: 0,
      hitsTaken: 0,
      lastFireTime: 0,
    };

    playerHitsRef.current = 0;
    goldEarnedRef.current = 0;
    enemiesDestroyedRef.current = 0;
    battleEndedRef.current = false;
    projectilesRef.current = [];
    particlesRef.current = [];
    startTimeRef.current = performance.now();
    battleTimeRef.current = 0;

    const enemies: ShipEntity[] = [];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      enemies.push({
        id: `enemy-${i}`,
        x: CANVAS_WIDTH - 100 - Math.random() * 150,
        y: 100 + (CANVAS_HEIGHT - 200) * (i / (ENEMY_COUNT - 1 || 1)),
        angle: Math.PI,
        health: ENEMY_HITS_TO_SINK,
        maxHealth: ENEMY_HITS_TO_SINK,
        isPlayer: false,
        size: SHIP_SIZE * 0.9,
        velocityX: 0,
        velocityY: 0,
        hitsTaken: 0,
        lastFireTime: 0,
      });
    }
    enemyShipsRef.current = enemies;
  }, [activeShip]);

  const createExplosion = useCallback((x: number, y: number) => {
    const particles: ParticleEntity[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      const radius = 2 + Math.random() * 3;
      const color = Math.random() > 0.5 ? '#ff6b35' : '#ff0000';

      particles.push({
        id: `particle-${Date.now()}-${i}-${Math.random()}`,
        x,
        y,
        radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        life: 1000,
        maxLife: 1000,
      });
    }
    particlesRef.current = [...particlesRef.current, ...particles];

    if (particlesRef.current.length > 200) {
      particlesRef.current = particlesRef.current.slice(-200);
    }
  }, []);

  const fireProjectile = useCallback((fromShip: ShipEntity, targetX: number, targetY: number, isPlayer: boolean) => {
    const dx = targetX - fromShip.x;
    const dy = targetY - fromShip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const speed = isPlayer ? PROJECTILE_SPEED : ENEMY_PROJECTILE_SPEED;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const projectile: ProjectileEntity = {
      id: `proj-${Date.now()}-${Math.random()}`,
      x: fromShip.x + (dx / dist) * (fromShip.size * 0.5),
      y: fromShip.y + (dy / dist) * (fromShip.size * 0.5),
      vx,
      vy,
      radius: PROJECTILE_RADIUS,
      isPlayer,
    };

    projectilesRef.current = [...projectilesRef.current, projectile];
  }, []);

  const checkCollision = useCallback((proj: ProjectileEntity, ship: ShipEntity): boolean => {
    const dx = proj.x - ship.x;
    const dy = proj.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < ship.size * 0.4 + proj.radius;
  }, []);

  const endBattleHandler = useCallback((victory: boolean) => {
    if (battleEndedRef.current) return;
    battleEndedRef.current = true;

    const hitsTaken = playerHitsRef.current;
    const battleTime = battleTimeRef.current;
    const enemiesDestroyed = enemiesDestroyedRef.current;

    let goldEarned = 0;
    if (victory) {
      goldEarned = 50 + 5 * enemiesDestroyed;
      if (hitsTaken < 3) goldEarned += 20;
      if (battleTime < 60) goldEarned += 10;
    }

    goldEarnedRef.current = goldEarned;

    setTimeout(() => {
      if (activeShipId) {
        endBattle(
          {
            victory,
            goldEarned,
            hitsTaken,
            battleTime,
            enemiesDestroyed,
          },
          activeShipId
        );
      }
    }, 1500);
  }, [activeShipId, endBattle]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    lastTimeRef.current = timestamp;

    if (!battleEndedRef.current) {
      battleTimeRef.current = (timestamp - startTimeRef.current) / 1000;

      updatePlayer();
      updateEnemies(timestamp);
      updateProjectiles();
      updateParticles(16);
      checkCollisions();
      checkBattleEnd();
    }

    setRenderTick(t => t + 1);
    animationRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const updatePlayer = () => {
    const player = playerShipRef.current;
    if (!player) return;

    let dx = 0;
    let dy = 0;

    if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dy -= 1;
    if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dy += 1;
    if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= 1;
    if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    player.x += dx * PLAYER_SPEED;
    player.y += dy * PLAYER_SPEED;

    player.x = Math.max(player.size / 2, Math.min(CANVAS_WIDTH - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(CANVAS_HEIGHT - player.size / 2, player.y));

    const aimDx = mouseRef.current.x - player.x;
    const aimDy = mouseRef.current.y - player.y;
    player.angle = Math.atan2(aimDy, aimDx);
  };

  const updateEnemies = (timestamp: number) => {
    const player = playerShipRef.current;
    const enemies = enemyShipsRef.current;

    enemies.forEach(enemy => {
      if (enemy.health <= 0) return;

      const dx = player ? player.x - enemy.x : 0;
      const dy = player ? player.y - enemy.y : 0;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.angle = Math.atan2(dy, dx);
      }

      if (dist > ENEMY_FIRE_RANGE * 0.6) {
        enemy.x += (dx / dist) * ENEMY_SPEED;
        enemy.y += (dy / dist) * ENEMY_SPEED;
      }

      if (dist < ENEMY_FIRE_RANGE && timestamp - enemy.lastFireTime > ENEMY_FIRE_COOLDOWN) {
        if (player) {
          fireProjectile(enemy, player.x, player.y, false);
          enemy.lastFireTime = timestamp;
        }
      }
    });
  };

  const updateProjectiles = () => {
    projectilesRef.current = projectilesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;

      return p.x > -50 && p.x < CANVAS_WIDTH + 50 &&
             p.y > -50 && p.y < CANVAS_HEIGHT + 50;
    });

    if (projectilesRef.current.length > 200) {
      projectilesRef.current = projectilesRef.current.slice(-200);
    }
  };

  const updateParticles = (deltaTime: number) => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      return p.life > 0;
    });
  };

  const checkCollisions = () => {
    const projectiles = projectilesRef.current;
    const player = playerShipRef.current;
    const enemies = enemyShipsRef.current;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      if (proj.isPlayer) {
        for (const enemy of enemies) {
          if (enemy.health <= 0) continue;
          if (checkCollision(proj, enemy)) {
            enemy.hitsTaken += 1;
            enemy.health = Math.max(0, ENEMY_HITS_TO_SINK - enemy.hitsTaken);
            createExplosion(proj.x, proj.y);
            projectiles.splice(i, 1);

            if (enemy.health <= 0) {
              createExplosion(enemy.x, enemy.y);
              enemiesDestroyedRef.current += 1;
            }
            break;
          }
        }
      } else {
        if (player && player.health > 0 && checkCollision(proj, player)) {
          player.hitsTaken += 1;
          player.health = Math.max(0, player.maxHealth - player.hitsTaken * 20);
          playerHitsRef.current += 1;
          createExplosion(proj.x, proj.y);
          projectiles.splice(i, 1);
        }
      }
    }
  };

  const checkBattleEnd = () => {
    const player = playerShipRef.current;
    const enemies = enemyShipsRef.current;

    if (player && player.health <= 0) {
      endBattleHandler(false);
      return;
    }

    const allEnemiesDead = enemies.every(e => e.health <= 0);
    if (allEnemiesDead) {
      endBattleHandler(true);
    }
  };

  const getCanvasCoord = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const canvas = container.querySelector('canvas');
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coord = getCanvasCoord(e.clientX, e.clientY);
    mouseRef.current.x = coord.x;
    mouseRef.current.y = coord.y;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    mouseRef.current.isDown = true;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    mouseRef.current.isDown = false;

    const player = playerShipRef.current;
    if (!player || player.health <= 0 || battleEndedRef.current) return;

    const now = performance.now();
    if (now - lastFireRef.current < 300) return;
    lastFireRef.current = now;

    fireProjectile(player, mouseRef.current.x, mouseRef.current.y, true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    initGame();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initGame, gameLoop]);

  const player = playerShipRef.current;
  const projectiles = projectilesRef.current;
  const particles = particlesRef.current;

  let aimStart: { x: number; y: number } | null = null;
  let aimEnd: { x: number; y: number } | null = null;
  if (player && player.health > 0) {
    aimStart = { x: player.x, y: player.y };
    aimEnd = { x: mouseRef.current.x, y: mouseRef.current.y };
  }

  const time = battleTimeRef.current;
  const waves = wavesRef.current;
  const enemiesRemaining = enemyShipsRef.current.filter(e => e.health > 0).length;

  return (
    <div className="battle-scene">
      <div
        className="battle-canvas-container"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <CanvasRenderer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          playerShip={player}
          enemyShips={enemyShipsRef.current}
          projectiles={projectiles}
          particles={particles}
          aimStart={aimStart}
          aimEnd={aimEnd}
          waves={waves}
          time={time}
          goldEarned={goldEarnedRef.current}
          enemiesRemaining={enemiesRemaining}
        />
      </div>
      <div className="battle-controls-hint">
        <span>WASD 移动</span>
        <span className="hint-sep">|</span>
        <span>鼠标瞄准 · 点击发射</span>
      </div>
      {battleEndedRef.current && (
        <div className="battle-end-overlay">
          <div className="battle-end-text">
            {playerShipRef.current && playerShipRef.current.health > 0 ? '🏆 胜利！' : '💀 失败'}
          </div>
          <div className="battle-end-subtext">
            获得 {goldEarnedRef.current} 金币
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleScene;
