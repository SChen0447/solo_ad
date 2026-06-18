import type { Tower, Enemy } from '../state/gameStore';

export interface AttackResult {
  targetEnemyId: string;
  damage: number;
  effects: { burn?: boolean; slow?: boolean; chain?: boolean };
  chainTargets?: Array<{ id: string; damage: number }>;
}

const dist = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};

export const findEnemiesInRange = (
  tower: Tower,
  enemies: Enemy[]
): Enemy[] => {
  return enemies.filter(e =>
    e.hp > 0 &&
    dist(tower.x, tower.y, e.x, e.y) <= tower.range
  );
};

export const findNearestEnemy = (
  tower: Tower,
  enemies: Enemy[]
): Enemy | null => {
  const inRange = findEnemiesInRange(tower, enemies);
  if (inRange.length === 0) return null;

  let nearest: Enemy | null = null;
  let minDist = Infinity;

  for (const e of inRange) {
    const d = dist(tower.x, tower.y, e.x, e.y);
    if (d < minDist) {
      minDist = d;
      nearest = e;
    }
  }

  return nearest;
};

export const processTowerAttack = (
  tower: Tower,
  enemies: Enemy[],
  currentTime: number
): AttackResult | null => {
  const cooldown = 1000;
  if (currentTime - tower.lastAttackTime < cooldown) return null;

  const target = findNearestEnemy(tower, enemies);
  if (!target) return null;

  const result: AttackResult = {
    targetEnemyId: target.id,
    damage: tower.attack,
    effects: {},
  };

  switch (tower.type) {
    case 'fire':
      result.effects.burn = true;
      result.damage = tower.attack;
      break;
    case 'ice':
      result.effects.slow = true;
      result.damage = tower.attack;
      break;
    case 'lightning':
      result.effects.chain = true;
      result.damage = tower.attack;
      result.chainTargets = findChainTargets(target, enemies, tower.attack * 0.6, 3);
      break;
  }

  return result;
};

const findChainTargets = (
  firstTarget: Enemy,
  enemies: Enemy[],
  chainDamage: number,
  maxChains: number
): Array<{ id: string; damage: number }> => {
  const result: Array<{ id: string; damage: number }> = [];
  const hit = new Set<string>([firstTarget.id]);
  let current = firstTarget;
  let remaining = maxChains;
  let damage = chainDamage;

  while (remaining > 0) {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const e of enemies) {
      if (hit.has(e.id) || e.hp <= 0) continue;
      const d = dist(current.x, current.y, e.x, e.y);
      if (d <= 100 && d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    if (!nearest) break;

    result.push({ id: nearest.id, damage: Math.floor(damage) });
    hit.add(nearest.id);
    current = nearest;
    damage *= 0.7;
    remaining--;
  }

  return result;
};

export const processHeroSkill = (
  heroX: number,
  heroY: number,
  radius: number,
  baseDamage: number,
  enemies: Enemy[]
): Array<{ id: string; damage: number }> => {
  const result: Array<{ id: string; damage: number }> = [];

  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = dist(heroX, heroY, e.x, e.y);
    if (d <= radius) {
      result.push({ id: e.id, damage: baseDamage });
    }
  }

  return result;
};
