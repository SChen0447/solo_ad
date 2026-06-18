import { v4 as uuidv4 } from 'uuid';
import type { Enemy } from '../state/gameStore';

export interface Point {
  x: number;
  y: number;
}

export const generatePath = (offsetX: number, offsetY: number, cellSize: number): Point[] => {
  const path: Point[] = [];
  const add = (gx: number, gy: number) => {
    path.push({
      x: offsetX + gx * cellSize + cellSize / 2,
      y: offsetY + gy * cellSize + cellSize / 2,
    });
  };

  for (let x = 0; x <= 2; x++) add(x, 0);
  for (let y = 1; y <= 3; y++) add(2, y);
  for (let x = 3; x <= 7; x++) add(x, 3);
  for (let y = 4; y <= 6; y++) add(7, y);
  for (let x = 6; x >= 4; x--) add(x, 6);
  for (let y = 7; y <= 9; y++) add(4, y);
  for (let x = 5; x <= 9; x++) add(x, 9);

  return path;
};

const interpolateColor = (t: number): string => {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(0 + clamped * (255 - 0));
  const g = Math.round(200 + clamped * (0 - 200));
  const b = Math.round(0 + clamped * (0 - 0));
  return `rgb(${r},${g},${b})`;
};

export const spawnWave = (
  waveNumber: number,
  path: Point[]
): Enemy[] => {
  const enemies: Enemy[] = [];
  const baseCount = 10;
  const count = baseCount + Math.floor((waveNumber - 1) * 2);
  const safeCount = Math.min(count, 25);

  const baseHp = 50 * Math.pow(1.2, waveNumber - 1);
  const baseSpeed = 0.8 + Math.min(waveNumber * 0.08, 1.5);

  const colorT = Math.min((waveNumber - 1) / 10, 1);
  const color = interpolateColor(colorT);

  for (let i = 0; i < safeCount; i++) {
    if (path.length === 0) continue;

    const delay = i * 0.4;
    const startX = path[0].x - delay * 60;
    const startY = path[0].y;

    enemies.push({
      id: uuidv4(),
      x: startX,
      y: startY,
      hp: Math.floor(baseHp),
      maxHp: Math.floor(baseHp),
      speed: baseSpeed,
      baseSpeed: baseSpeed,
      pathIndex: 0,
      burnTime: 0,
      burnDamage: 0,
      slowTime: 0,
      slowFactor: 1,
      reachedEnd: false,
      color,
    });
  }

  return enemies;
};

export const updateEnemiesMovement = (
  enemies: Enemy[],
  path: Point[],
  dt: number,
  onReachedEnd: (id: string) => void
): Enemy[] => {
  if (path.length < 2) return enemies;

  const updated: Enemy[] = [];

  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.reachedEnd) continue;

    let { x, y, pathIndex, speed, baseSpeed, slowTime, slowFactor, burnTime, burnDamage } = enemy;

    if (slowTime > 0) {
      slowTime = Math.max(0, slowTime - dt);
      speed = baseSpeed * slowFactor;
    } else {
      speed = baseSpeed;
      slowFactor = 1;
    }

    if (burnTime > 0) {
      burnTime = Math.max(0, burnTime - dt);
    }

    const targetIdx = Math.min(pathIndex + 1, path.length - 1);
    const target = path[targetIdx];

    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      pathIndex = targetIdx;
      if (pathIndex >= path.length - 1) {
        onReachedEnd(enemy.id);
        continue;
      }
    } else {
      const moveDist = speed * dt * 60;
      const ratio = Math.min(moveDist / dist, 1);
      x += dx * ratio;
      y += dy * ratio;
    }

    updated.push({
      ...enemy,
      x,
      y,
      pathIndex,
      speed,
      slowTime,
      slowFactor,
      burnTime,
      burnDamage,
    });
  }

  return updated;
};

export const applyBurnDamage = (
  enemies: Enemy[],
  dt: number,
  onKill: () => void,
  onGold: (n: number) => void
): Enemy[] => {
  const updated: Enemy[] = [];

  for (const enemy of enemies) {
    let { hp, burnTime, burnDamage } = enemy;

    if (burnTime > 0 && burnDamage > 0) {
      const damage = burnDamage * dt;
      hp -= damage;

      if (hp <= 0) {
        onKill();
        onGold(20);
        continue;
      }
    }

    updated.push({ ...enemy, hp });
  }

  return updated;
};
