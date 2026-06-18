import {
  useGameStore,
  Tower,
  TowerType,
  Enemy,
  Projectile,
  TOWER_COSTS,
  TOWER_BASE_STATS,
  getRankUpgrade,
  generateId,
} from './store';

interface TowerManager {
  addTower: (type: TowerType, hexQ: number, hexR: number, x: number, z: number) => boolean;
  upgradeTower: (towerId: string) => boolean;
  updateAttacks: (deltaTime: number, currentTime: number) => void;
}

const store = useGameStore;

const findTarget = (tower: Tower, enemies: Enemy[]): Enemy | null => {
  let best: Enemy | null = null;
  let bestProgress = -1;
  for (const e of enemies) {
    if (e.hp <= 0 || e.reachedCastle) continue;
    const dx = e.x - tower.x;
    const dz = e.z - tower.z;
    const distSq = dx * dx + dz * dz;
    const rangeSq = tower.range * tower.range;
    if (distSq <= rangeSq) {
      if (e.pathIndex > bestProgress) {
        bestProgress = e.pathIndex;
        best = e;
      }
    }
  }
  return best;
};

const createProjectile = (
  tower: Tower,
  target: Enemy,
  currentTime: number,
): Projectile => {
  const base: Projectile = {
    id: generateId(),
    type: tower.type,
    startX: tower.x,
    startZ: tower.z,
    startY: 1.8,
    targetId: target.id,
    targetX: target.x,
    targetZ: target.z,
    damage: tower.damage,
    splashRadius: 0,
    speed: tower.type === 'arrow' ? 28 : tower.type === 'magic' ? 20 : 14,
    progress: 0,
    isAoe: tower.type === 'stone',
    hasSpecial: !!tower.specialEffect,
    specialType: tower.specialEffect,
    createdAt: currentTime,
  };
  if (tower.type === 'stone') base.splashRadius = 1.8;
  if (tower.type === 'magic') base.splashRadius = 1.4;
  return base;
};

export const towerManager: TowerManager = {
  addTower(type, hexQ, hexR, x, z) {
    const state = store.getState();
    const cost = TOWER_COSTS[type];
    if (state.gold < cost) return false;
    const occupied = state.towers.some(t => t.hexQ === hexQ && t.hexR === hexR);
    if (occupied) return false;

    if (!state.deductGold(cost)) return false;

    const baseStats = TOWER_BASE_STATS[type];
    const rankUp = getRankUpgrade('D', type);
    const tower: Tower = {
      id: generateId(),
      type,
      rank: 'D',
      hexQ,
      hexR,
      x,
      z,
      damage: rankUp.damage ?? baseStats.damage,
      range: rankUp.range ?? baseStats.range,
      attackSpeed: rankUp.attackSpeed ?? baseStats.attackSpeed,
      lastAttackTime: 0,
      specialEffect: rankUp.specialEffect,
    };
    state.addTower(tower);

    state.addParticle({
      id: generateId(),
      type: 'buildDust',
      x,
      z,
      y: 0,
      createdAt: performance.now(),
      duration: 400,
    });

    return true;
  },

  upgradeTower(towerId) {
    return store.getState().upgradeTower(towerId);
  },

  updateAttacks(_deltaTime, currentTime) {
    const state = store.getState();
    const { towers, enemies } = state;
    const newProjectiles: Projectile[] = [];
    const updatedTowers: Tower[] = [];
    let changed = false;

    for (const tower of towers) {
      let t = tower;
      const interval = 1000 / tower.attackSpeed;
      if (currentTime - tower.lastAttackTime >= interval) {
        const target = findTarget(tower, enemies);
        if (target) {
          const p = createProjectile(tower, target, currentTime);
          newProjectiles.push(p);
          t = { ...tower, lastAttackTime: currentTime };
          changed = true;

          if (tower.specialEffect === 'doubleShot') {
            const p2 = createProjectile(tower, target, currentTime + 25);
            p2.damage = Math.round(p2.damage * 0.7);
            newProjectiles.push(p2);
          }
        }
      }
      updatedTowers.push(t);
    }

    if (changed) state.updateTowers(updatedTowers);
    if (newProjectiles.length > 0) {
      newProjectiles.forEach(p => state.addProjectile(p));
    }
  },
};

export function updateProjectiles(deltaTime: number, currentTime: number) {
  const state = store.getState();
  const { projectiles, enemies } = state;
  const remaining: Projectile[] = [];
  const newParticles: typeof state.particles = [];
  const enemyDamageMap = new Map<string, { damage: number; freeze?: boolean; stun?: boolean }>();
  let killsFromThisFrame = 0;
  let goldFromThisFrame = 0;

  for (const p of projectiles) {
    const target = enemies.find(e => e.id === p.targetId && e.hp > 0 && !e.reachedCastle);
    if (target) {
      p.targetX = target.x;
      p.targetZ = target.z;
    }

    const dx = p.targetX - p.startX;
    const dz = p.targetZ - p.startZ;
    const distTotal = Math.sqrt(dx * dx + dz * dz);
    if (distTotal < 0.001) continue;
    p.progress += (p.speed * deltaTime * 1000) / distTotal;

    if (p.progress >= 1) {
      const impactX = p.targetX;
      const impactZ = p.targetZ;

      if (p.type === 'stone') {
        newParticles.push({
          id: generateId(),
          type: 'explosion',
          x: impactX,
          z: impactZ,
          y: 0.1,
          createdAt: currentTime,
          duration: 350,
          color: '#c49a6c',
        });
      } else if (p.type === 'magic') {
        newParticles.push({
          id: generateId(),
          type: 'explosion',
          x: impactX,
          z: impactZ,
          y: 0.5,
          createdAt: currentTime,
          duration: 280,
          color: '#6ba3ff',
        });
      }

      if (p.isAoe) {
        for (const e of enemies) {
          if (e.hp <= 0 || e.reachedCastle) continue;
          const ex = e.x - impactX;
          const ez = e.z - impactZ;
          const d = Math.sqrt(ex * ex + ez * ez);
          if (d <= p.splashRadius) {
            const falloff = 1 - (d / p.splashRadius) * 0.5;
            const dmg = Math.round(p.damage * falloff);
            const prev = enemyDamageMap.get(e.id) || { damage: 0 };
            prev.damage += dmg;
            if (p.type === 'magic') prev.freeze = true;
            if (p.specialType === 'stun') prev.stun = true;
            enemyDamageMap.set(e.id, prev);
          }
        }
      } else if (target) {
        const prev = enemyDamageMap.get(target.id) || { damage: 0 };
        prev.damage += p.damage;
        if (p.specialType === 'freeze') prev.freeze = true;
        if (p.specialType === 'stun') prev.stun = true;
        enemyDamageMap.set(target.id, prev);
      }
      continue;
    }
    remaining.push(p);
  }

  state.updateProjectiles(remaining);

  if (enemyDamageMap.size > 0) {
    const updatedEnemies = enemies.map(e => {
      const dmg = enemyDamageMap.get(e.id);
      if (!dmg) return e;
      const newHp = e.hp - dmg.damage;
      let slowUntil = e.slowUntil;
      let stunUntil = e.stunUntil;
      if (dmg.freeze) slowUntil = Math.max(slowUntil, currentTime + 2000);
      if (dmg.stun) stunUntil = Math.max(stunUntil, currentTime + 1000);
      const died = newHp <= 0 && e.hp > 0;
      if (died) {
        killsFromThisFrame++;
        goldFromThisFrame += e.goldReward;
        newParticles.push({
          id: generateId(),
          type: 'death',
          x: e.x,
          z: e.z,
          y: 0.4,
          createdAt: currentTime,
          duration: 300,
        });
      }
      return { ...e, hp: newHp, slowUntil, stunUntil };
    });
    state.updateEnemies(updatedEnemies);
    if (killsFromThisFrame > 0) {
      for (let i = 0; i < killsFromThisFrame; i++) state.addKill();
    }
    if (goldFromThisFrame > 0) {
      state.addGold(goldFromThisFrame);
    }
  }

  if (newParticles.length > 0) {
    newParticles.forEach(pa => state.addParticle(pa));
  }
}

export function cleanupParticles(currentTime: number) {
  const state = store.getState();
  const kept = state.particles.filter(p => currentTime - p.createdAt < p.duration);
  if (kept.length !== state.particles.length) state.updateParticles(kept);
}
