import {
  useGameStore,
  Enemy,
  EnemyType,
  ENEMY_STATS,
  generateId,
} from './store';

interface EnemyManager {
  spawnWave: (waveNumber: number) => void;
  updateEnemies: (deltaTime: number, currentTime: number) => void;
  getEnemies: () => Enemy[];
}

const store = useGameStore;

const pickEnemyType = (waveNumber: number, isRandom: boolean, ratios: {
  infantryRatio: number; cavalryRatio: number; batteringRamRatio: number; catapultRatio: number;
}): EnemyType => {
  const types: EnemyType[] = ['infantry', 'cavalry', 'batteringRam', 'catapult'];
  const weights = isRandom
    ? [0.45, 0.3, 0.15, 0.1]
    : [ratios.infantryRatio, ratios.cavalryRatio, ratios.batteringRamRatio, ratios.catapultRatio];

  const waveBoost = Math.min(waveNumber * 0.02, 0.15);
  const adj = weights.map((w, i) => i >= 2 ? w + waveBoost / 2 : Math.max(0.05, w - waveBoost / 2));
  const sum = adj.reduce((a, b) => a + b, 0);
  const norm = adj.map(w => w / sum);

  let r = Math.random();
  for (let i = 0; i < types.length; i++) {
    if (r < norm[i]) return types[i];
    r -= norm[i];
  }
  return 'infantry';
};

const scaleWaveStats = (baseHp: number, waveNumber: number) => {
  const hpScale = 1 + (waveNumber - 1) * 0.18;
  return Math.round(baseHp * hpScale);
};

const availablePathIds = [0, 1, 2];

export const enemyManager: EnemyManager = {
  spawnWave(waveNumber) {
    const state = store.getState();
    const config = state.waveConfig;
    const count = Math.min(30, Math.max(5, config.enemyCount + Math.floor(waveNumber / 3) * 2));
    const paths = state.paths;
    if (paths.length === 0) return;

    const spawnCount = Math.min(3, 2 + Math.floor(Math.random() * 2));
    const chosenPaths = [...availablePathIds].sort(() => Math.random() - 0.5).slice(0, spawnCount);
    const enemiesPerPath = Math.ceil(count / spawnCount);

    const newEnemies: Enemy[] = [];
    let spawnDelay = 0;

    for (const pathId of chosenPaths) {
      const path = paths[pathId];
      if (!path || path.length === 0) continue;

      for (let i = 0; i < enemiesPerPath; i++) {
        if (newEnemies.length >= count) break;
        const type = pickEnemyType(waveNumber, config.isRandom, config);
        const stats = ENEMY_STATS[type];
        const start = path[0];
        const hp = scaleWaveStats(stats.hp, waveNumber);
        const spawned: Enemy = {
          id: generateId(),
          type,
          hp,
          maxHp: hp,
          speed: stats.speed,
          baseSpeed: stats.speed,
          damage: stats.damage,
          goldReward: stats.gold + Math.floor(waveNumber / 2),
          pathIndex: 0,
          pathId,
          x: start.x + (Math.random() - 0.5) * 0.2,
          z: start.z + (Math.random() - 0.5) * 0.2,
          slowUntil: 0,
          stunUntil: 0,
          reachedCastle: false,
        };
        newEnemies.push(spawned);
        spawnDelay += 1;
      }
    }

    newEnemies.forEach((e, idx) => {
      setTimeout(() => {
        if (store.getState().enemies.find(en => en.id === e.id)) return;
        store.getState().addEnemies([e]);
      }, idx * 350);
    });
  },

  updateEnemies(deltaTime, currentTime) {
    const state = store.getState();
    const { enemies, paths } = state;
    if (enemies.length === 0 || paths.length === 0) return;

    const dt = deltaTime;
    let castleDmg = 0;
    const aliveEnemies: Enemy[] = [];
    const reachedCastle: Enemy[] = [];

    for (const e of enemies) {
      if (e.reachedCastle) continue;
      if (e.hp <= 0) continue;

      const stunned = e.stunUntil > currentTime;
      if (stunned) {
        aliveEnemies.push(e);
        continue;
      }

      const slowed = e.slowUntil > currentTime;
      const spd = slowed ? e.baseSpeed * 0.4 : e.baseSpeed;
      e.speed = spd;

      const path = paths[e.pathId];
      if (!path) continue;

      let remaining = spd * dt;
      let currentIndex = e.pathIndex;
      let x = e.x;
      let z = e.z;
      let arrived = false;

      while (remaining > 0 && currentIndex < path.length - 1) {
        const nextIdx = currentIndex + 1;
        const nx = path[nextIdx].x;
        const nz = path[nextIdx].z;
        const dx = nx - x;
        const dz = nz - z;
        const distToNext = Math.sqrt(dx * dx + dz * dz);

        if (distToNext < 0.001) {
          currentIndex = nextIdx;
          continue;
        }

        if (remaining >= distToNext) {
          x = nx;
          z = nz;
          currentIndex = nextIdx;
          remaining -= distToNext;
        } else {
          const ratio = remaining / distToNext;
          x += dx * ratio;
          z += dz * ratio;
          remaining = 0;
        }
      }

      if (currentIndex >= path.length - 1) {
        arrived = true;
      }

      const updated = { ...e, x, z, pathIndex: currentIndex };

      if (arrived) {
        let dmg = e.damage;
        if (e.type === 'batteringRam') dmg *= 2;
        castleDmg += dmg;
        reachedCastle.push(updated);
      } else {
        aliveEnemies.push(updated);
      }
    }

    const totalUpdated = aliveEnemies.concat(reachedCastle.map(r => ({ ...r, reachedCastle: true })));

    if (totalUpdated.length !== enemies.length ||
      totalUpdated.some((e, i) => e !== enemies[i])) {
      state.updateEnemies(aliveEnemies);
    }

    if (castleDmg > 0) {
      state.damageCastle(castleDmg);
    }
  },

  getEnemies() {
    return store.getState().enemies;
  },
};

export function checkWaveEnd(currentTime: number) {
  const state = store.getState();
  if (state.phase !== 'waveActive') return;

  const pendingSpawned = state.enemies.length === 0;
  const allDeadOrDone = state.enemies.every(e => e.hp <= 0 || e.reachedCastle);

  if (pendingSpawned && allDeadOrDone && state.currentWave > 0) {
    if (state.currentWave >= state.totalWaves) {
      state.setPhase('victory');
      state.saveHighScore();
      return;
    }
    state.setPhase('waveInterval');
    state.setWaveIntervalRemaining(10);

    const intervalMs = 100;
    let remaining = 10;
    const timer = setInterval(() => {
      remaining -= intervalMs / 1000;
      store.getState().setWaveIntervalRemaining(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        const s = store.getState();
        if (s.phase === 'waveInterval') {
          s.startWave();
          enemyManager.spawnWave(s.currentWave);
        }
      }
    }, intervalMs);
  }
}
